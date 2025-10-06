import * as vscode from 'vscode';
import { MemoryManagerService } from './core/MemoryManagerService';
import { CommandRouter } from './chat/CommandRouter';
import { ContentInjectionEngine } from './chat/ContentInjectionEngine';
import { TagCompletionProvider } from './chat/TagCompletionProvider';
import { StatusBarManager } from './core/StatusBarManager';
import { ErrorReporter } from './core/ErrorReporter';
import { MemoryInspectionCommands } from './core/MemoryInspectionCommands';
import { Logger } from './core/Logger';

let memoryManager: MemoryManagerService;
let contentInjector: ContentInjectionEngine;
let tagCompletionProvider: TagCompletionProvider;
let statusBarManager: StatusBarManager;
let inspectionCommands: MemoryInspectionCommands;

export async function activate(context: vscode.ExtensionContext) {
    const logger = Logger.getInstance();
    logger.info('VS Code Memory Manager extension activated');

    // Initialize memory manager service
    memoryManager = new MemoryManagerService();

    // Initialize content injection engine
    contentInjector = new ContentInjectionEngine(
        memoryManager.getMemoryIndex(),
        memoryManager.getTagSystem()
    );

    // Initialize tag completion provider
    tagCompletionProvider = new TagCompletionProvider(
        memoryManager.getTagSystem(),
        memoryManager.getMemoryIndex()
    );

    // Register completion provider for chat input
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        { scheme: 'vscode-chat', language: '*' },
        tagCompletionProvider,
        ' ', // Trigger on space after command
        '.' // Trigger on dot for hierarchical navigation
    );
    context.subscriptions.push(completionProvider);

    // Initialize status bar manager
    statusBarManager = StatusBarManager.getInstance();
    statusBarManager.setMemoryIndex(memoryManager.getMemoryIndex());
    statusBarManager.setErrorReporter(ErrorReporter.getInstance());
    context.subscriptions.push(statusBarManager.getStatusBarItem());

    // Register command to show output channel
    const showOutputCommand = vscode.commands.registerCommand('memoryManager.showOutput', () => {
        ErrorReporter.getInstance().showOutputChannel(false);
    });
    context.subscriptions.push(showOutputCommand);

    // Register memory inspection commands (Feature 9, Story 1)
    inspectionCommands = new MemoryInspectionCommands(
        memoryManager,
        memoryManager.getMemoryIndex(),
        memoryManager.getTagSystem()
    );
    inspectionCommands.registerCommands(context);

    // Start watching memory files
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        const memoryPattern = new vscode.RelativePattern(workspaceFolder, 'Memory/**/*.md');
        memoryManager.start(memoryPattern.pattern);

        // Initial sync of existing memory files
        const memoryFiles = await vscode.workspace.findFiles(memoryPattern);
        await memoryManager.initialSync(memoryFiles);
    }

    // Register Copilot Chat Participant
    const participant = vscode.chat.createChatParticipant('memory.manager', async (request, context, stream, _token) => {
        // Check if the command is 'memory-tag'
        if (request.command === 'memory-tag') {
            try {
                // Phase 1: Parse ONLY the first line to extract tag patterns
                const parseResult = CommandRouter.parseMemoryTagCommand(request.prompt);
                const { tags, remainingPrompt } = parseResult;

                if (tags.length === 0) {
                    stream.markdown('Please specify tag patterns on the first line.\n\nExample:\n```\n@memory /memory-tag backend.database\nHow do I implement connection pooling?\n```');
                    return {};
                }

                // Track recent tags for completion suggestions
                tags.forEach(tag => tagCompletionProvider.addRecentTag(tag));

                // Get summary of matches for all tags
                const summary = contentInjector.getMatchSummaryForTags(tags);

                if (summary.count === 0) {
                    stream.markdown(`No memory files found with tags: **${tags.join(', ')}**`);
                    return {};
                }

                // Get all matching memory file paths
                const filePaths = summary.filePaths;

                // Notify user about found files
                stream.markdown(`✅ Found ${filePaths.length} memory file(s) matching tags **${tags.join(', ')}**\n\n`);

                // Phase 2: Process the user's actual prompt (everything except first line)
                if (remainingPrompt) {
                    // Read memory file contents and strip YAML headers
                    stream.markdown('📖 Reading memory files...\n\n');

                    const memoryContents = await contentInjector.getMemoryContents(filePaths);

                    if (memoryContents.length === 0) {
                        stream.markdown('⚠️ Could not read any memory files.\n');
                        return {};
                    }

                    // Build the query with memory content included directly
                    let queryWithMemories = '**Context from Memory Files:**\n\n';

                    for (const memory of memoryContents) {
                        const fileName = memory.filePath.split(/[/\\]/).pop() || memory.filePath;
                        queryWithMemories += `### ${memory.title} (${fileName})\n\n`;
                        queryWithMemories += `${memory.content}\n\n`;
                        queryWithMemories += '---\n\n';
                    }

                    queryWithMemories += `**User Question:**\n\n${remainingPrompt}`;

                    // Open chat with the query containing memory contents
                    stream.markdown('🚀 Opening chat with memory context...\n\n');

                    setTimeout(async () => {
                        try {
                            await vscode.commands.executeCommand(
                                'workbench.action.chat.open',
                                queryWithMemories
                            );
                        } catch (error) {
                            Logger.getInstance().error('Failed to open chat', error);
                        }
                    }, 500);

                    return {
                        metadata: {
                            command: 'memory-tag',
                            tagPatterns: tags,
                            matchCount: summary.count,
                            attachedFiles: filePaths,
                            userPrompt: remainingPrompt
                        }
                    };
                } else {
                    // No user prompt provided, just show the found files
                    stream.markdown(`Found these memory files:\n\n`);

                    for (const filePath of filePaths) {
                        const fileName = filePath.split(/[/\\]/).pop() || filePath;
                        stream.markdown(`- ${fileName}\n`);
                        // Show files as references in the current chat
                        stream.reference(vscode.Uri.file(filePath));
                    }

                    stream.markdown(`\nYou can now ask a follow-up question and these files will be available in the chat history.`);

                    return {
                        metadata: {
                            command: 'memory-tag',
                            tagPatterns: tags,
                            matchCount: summary.count,
                            attachedFiles: filePaths
                        }
                    };
                }
            } catch (error) {
                stream.markdown(`Error retrieving memories: ${error instanceof Error ? error.message : String(error)}`);
                return {};
            }
        } else {
            stream.markdown('Unknown command. Use `@memory /memory-tag <tags>` with your question on the next line.\n\nExample:\n```\n@memory /memory-tag backend.database\nHow does connection pooling work?\n```');
        }

        return {};
    });

    // participant.iconPath = vscode.Uri.file(context.extensionPath + '/icon.png');

    context.subscriptions.push(participant);
    context.subscriptions.push({ dispose: () => memoryManager.dispose() });
}

export function deactivate() {
    const logger = Logger.getInstance();
    logger.info('VS Code Memory Manager extension deactivated');

    // Feature 10, Story 5: Proper resource cleanup to prevent memory leaks
    if (memoryManager) {
        memoryManager.dispose();
    }
}
