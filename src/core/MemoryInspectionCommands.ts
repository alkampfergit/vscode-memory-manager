import * as vscode from 'vscode';
import { MemoryIndex } from './MemoryIndex';
import { TagSystem } from './TagSystem';
import { MemoryManagerService } from './MemoryManagerService';

/**
 * Memory Inspection Commands
 * Provides debugging and troubleshooting commands for inspecting the memory system
 * Feature 9, Story 1
 */
export class MemoryInspectionCommands {
    constructor(
        private memoryManagerService: MemoryManagerService,
        private memoryIndex: MemoryIndex,
        private tagSystem: TagSystem
    ) {}

    /**
     * Registers all inspection commands
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        // Command 1: Show All Tags
        const showAllTagsCommand = vscode.commands.registerCommand(
            'memory-manager.showAllTags',
            () => this.showAllTags()
        );
        context.subscriptions.push(showAllTagsCommand);

        // Command 2: Show Memory Contents
        const showMemoryContentsCommand = vscode.commands.registerCommand(
            'memory-manager.showMemoryContents',
            () => this.showMemoryContents()
        );
        context.subscriptions.push(showMemoryContentsCommand);

        // Command 3: Rebuild Memory Index
        const rebuildMemoryIndexCommand = vscode.commands.registerCommand(
            'memory-manager.rebuildMemoryIndex',
            () => this.rebuildMemoryIndex()
        );
        context.subscriptions.push(rebuildMemoryIndexCommand);
    }

    /**
     * Shows all tags in the system with file counts
     */
    private async showAllTags(): Promise<void> {
        const allTags = this.tagSystem.getAllTags();

        if (allTags.length === 0) {
            vscode.window.showInformationMessage('No tags found in the memory system.');
            return;
        }

        // Build hierarchical structure for display
        const hierarchicalTags = this.buildHierarchicalTagStructure(allTags);

        // Create a new text document to display the tags
        const doc = await vscode.workspace.openTextDocument({
            content: hierarchicalTags,
            language: 'plaintext'
        });

        await vscode.window.showTextDocument(doc, { preview: false });
    }

    /**
     * Builds a hierarchical representation of tags
     */
    private buildHierarchicalTagStructure(tags: string[]): string {
        // Sort tags alphabetically
        const sortedTags = tags.sort();

        let output = '# Memory Tags\n\n';
        output += `Total tags: ${sortedTags.length}\n\n`;
        output += '---\n\n';

        // Group tags by top-level category
        const tagTree = new Map<string, string[]>();

        for (const tag of sortedTags) {
            const parts = tag.split('.');
            const topLevel = parts[0];

            if (!tagTree.has(topLevel)) {
                tagTree.set(topLevel, []);
            }
            tagTree.get(topLevel)!.push(tag);
        }

        // Build hierarchical display
        for (const [topLevel, tagsInCategory] of Array.from(tagTree.entries()).sort()) {
            output += `## ${topLevel}\n\n`;

            for (const tag of tagsInCategory) {
                const filePaths = this.tagSystem.queryByTag(tag);
                const fileCount = filePaths.length;
                const indent = '  '.repeat((tag.split('.').length - 1));
                output += `${indent}- ${tag} (${fileCount} file${fileCount !== 1 ? 's' : ''})\n`;
            }

            output += '\n';
        }

        return output;
    }

    /**
     * Shows the full parsed content of the memory index
     */
    private async showMemoryContents(): Promise<void> {
        const allEntries = this.memoryIndex.getAll();

        if (allEntries.length === 0) {
            vscode.window.showInformationMessage('No memory files in the index.');
            return;
        }

        // Build JSON representation
        const indexData = allEntries.map(entry => ({
            filePath: entry.filePath,
            frontmatter: entry.frontmatter,
            contentPreview: entry.content.substring(0, 200) + (entry.content.length > 200 ? '...' : ''),
            lastModified: entry.lastModified.toISOString()
        }));

        const jsonContent = JSON.stringify(indexData, null, 2);

        // Create a new text document to display the contents
        const doc = await vscode.workspace.openTextDocument({
            content: jsonContent,
            language: 'json'
        });

        await vscode.window.showTextDocument(doc, { preview: false });
    }

    /**
     * Manually triggers a full re-scan and re-indexing of the Memory folder
     */
    private async rebuildMemoryIndex(): Promise<void> {
        try {
            vscode.window.showInformationMessage('Rebuilding memory index...');

            // Clear current index and tag system
            this.memoryIndex.clear();
            this.tagSystem.clear();

            // Find all memory files
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found.');
                return;
            }

            const memoryPattern = new vscode.RelativePattern(workspaceFolder, 'Memory/**/*.md');
            const memoryFiles = await vscode.workspace.findFiles(memoryPattern);

            // Re-index all files
            await this.memoryManagerService.initialSync(memoryFiles);

            vscode.window.showInformationMessage(
                `Memory index rebuilt successfully. ${memoryFiles.length} file(s) processed.`
            );
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to rebuild memory index: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}
