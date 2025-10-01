import * as vscode from 'vscode';
import { MemoryManagerService } from './core/MemoryManagerService';
import { CommandRouter } from './chat/CommandRouter';
import { ContentInjectionEngine } from './chat/ContentInjectionEngine';

let memoryManager: MemoryManagerService;
let contentInjector: ContentInjectionEngine;

export async function activate(context: vscode.ExtensionContext) {
    console.log('VS Code Memory Manager extension activated');

    // Initialize memory manager service
    memoryManager = new MemoryManagerService();

    // Initialize content injection engine
    contentInjector = new ContentInjectionEngine(
        memoryManager.getMemoryIndex(),
        memoryManager.getTagSystem()
    );

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

                // Get summary of matches for all tags
                const summary = contentInjector.getMatchSummaryForTags(tags);

                if (summary.count === 0) {
                    stream.markdown(`No memory files found with tags: **${tags.join(', ')}**`);
                    return {};
                }

                // Attach all matching memory files to the chat context
                const attachedFiles = await contentInjector.attachFilesByTags(tags);

                // Notify user about attached files
                stream.markdown(`✅ Attached ${attachedFiles.length} memory file(s) matching tags **${tags.join(', ')}**\n\n`);

                // Phase 2: Process the user's actual prompt (everything except first line)
                if (remainingPrompt) {
                    // Let Copilot process the user's prompt with the attached memory context
                    // The extension's work is done - Copilot will handle the rest
                    stream.markdown(`Processing your question with memory context...\n\n`);

                    return {
                        metadata: {
                            command: 'memory-tag',
                            tagPatterns: tags,
                            matchCount: summary.count,
                            attachedFiles: attachedFiles,
                            userPrompt: remainingPrompt
                        }
                    };
                } else {
                    // No user prompt provided, just attached the files
                    stream.markdown(`Memory files are now available in the chat context.`);
                    return {
                        metadata: {
                            command: 'memory-tag',
                            tagPatterns: tags,
                            matchCount: summary.count,
                            attachedFiles: attachedFiles
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
    console.log('VS Code Memory Manager extension deactivated');
}
