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
    const participant = vscode.chat.createChatParticipant('memory.manager', async (request, context, stream, token) => {
        // Check if the command is 'memory-tag'
        if (request.command === 'memory-tag') {
            try {
                // Parse the tag pattern from the prompt
                const tagPattern = CommandRouter.parseMemoryTagCommand(request.prompt);

                if (!tagPattern) {
                    stream.markdown('Please specify a tag pattern. Example: `@memory /memory-tag backend.database`');
                    return {};
                }

                // Get summary of matches
                const summary = contentInjector.getMatchSummary(tagPattern);

                // Get content for the tag
                const content = contentInjector.getContentByTag(tagPattern);

                // Stream the response
                stream.markdown(`Found ${summary.count} memory file(s) matching tag **${tagPattern}**:\n\n`);
                stream.markdown(content);

                // Add content to the chat context for Copilot
                return {
                    metadata: {
                        command: 'memory-tag',
                        tagPattern,
                        matchCount: summary.count
                    }
                };
            } catch (error) {
                stream.markdown(`Error retrieving memories: ${error instanceof Error ? error.message : String(error)}`);
                return {};
            }
        } else {
            stream.markdown('Unknown command. Use `@memory /memory-tag <tag>` to query memories by tag.');
        }

        return {};
    });

    participant.iconPath = vscode.Uri.file(context.extensionPath + '/icon.png');

    context.subscriptions.push(participant);
    context.subscriptions.push({ dispose: () => memoryManager.dispose() });
}

export function deactivate() {
    console.log('VS Code Memory Manager extension deactivated');
}
