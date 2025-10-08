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

    // Register manual refresh command
    const refreshCommand = vscode.commands.registerCommand('memoryManager.refresh', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const memoryPattern = new vscode.RelativePattern(workspaceFolder, 'Memory/**/*.md');
            const memoryFiles = await vscode.workspace.findFiles(memoryPattern);
            await memoryManager.initialSync(memoryFiles);
            vscode.window.showInformationMessage(`Memory Manager: Refreshed ${memoryFiles.length} file(s)`);
        }
    });
    context.subscriptions.push(refreshCommand);

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

                // Get summary of matches for all tags (including referenced files)
                const summary = await contentInjector.getMatchSummaryForTagsWithReferences(tags);

                if (summary.count === 0) {
                    stream.markdown(`No memory files found with tags: **${tags.join(', ')}**`);
                    return {};
                }

                // Get all matching memory file paths (including references)
                const filePaths = summary.filePaths;

                // Notify user about found files
                stream.markdown(`✅ Found ${filePaths.length} memory file(s) matching tags **${tags.join(', ')}**\n\n`);
                // dump all file names
                filePaths.forEach(path => {
                    const fileName = path.split(/[/\\]/).pop() || path;
                    stream.markdown(`- ${fileName}\n`);
                });
                stream.markdown('\n');

                // Phase 2: Process the user's actual prompt (everything except first line)
                if (remainingPrompt) {

                    for (const filePath of filePaths) {
                        const fileUri = vscode.Uri.file(filePath);
                        stream.reference(fileUri);
                    }

                    setTimeout(async () => {
                        try {
                            const fileUris = filePaths.map(path => vscode.Uri.file(path));

                            // Then open chat with the user's question
                            await vscode.commands.executeCommand(
                                'workbench.action.chat.open',
                                {
                                    query: remainingPrompt,
                                    attachFiles: fileUris
                                }
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
