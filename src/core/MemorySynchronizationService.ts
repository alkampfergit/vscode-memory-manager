import * as vscode from 'vscode';
import { MemoryFileParser } from './MemoryFileParser';
import { MemoryIndex } from './MemoryIndex';
import { TagSystem } from './TagSystem';

/**
 * Service for synchronizing the in-memory index with file system changes
 */
export class MemorySynchronizationService {
    constructor(
        private memoryIndex: MemoryIndex,
        private tagSystem: TagSystem
    ) {}

    /**
     * Handles file creation or update events
     * Reads, parses, and updates the memory index
     * @param uri The URI of the file that was created or changed
     */
    public async handleFileCreateOrChange(uri: vscode.Uri): Promise<void> {
        try {
            // Read file content
            const fileContent = await vscode.workspace.fs.readFile(uri);
            const content = Buffer.from(fileContent).toString('utf8');

            // Parse the file
            const parsed = MemoryFileParser.parse(content);

            // Get the file path
            const filePath = uri.fsPath;

            // Check if this file already exists in the index
            const existingEntry = this.memoryIndex.get(filePath);

            // If it exists, remove old tags first
            if (existingEntry) {
                this.tagSystem.removeTags(filePath, existingEntry.frontmatter.tags);
            }

            // Add or update the entry in the memory index
            this.memoryIndex.add(filePath, parsed.frontmatter, parsed.content);

            // Add tags to the tag system
            this.tagSystem.addTags(filePath, parsed.frontmatter.tags);

        } catch (error) {
            console.error(`Failed to process file ${uri.fsPath}: ${error}`);
            // Don't throw - we want to continue processing other files
        }
    }

    /**
     * Handles file deletion events
     * Removes the file from the memory index and tag system
     * @param uri The URI of the file that was deleted
     */
    public handleFileDelete(uri: vscode.Uri): void {
        try {
            const filePath = uri.fsPath;

            // Get the entry to retrieve tags before removing
            const entry = this.memoryIndex.get(filePath);

            if (entry) {
                // Remove tags from tag system
                this.tagSystem.removeTags(filePath, entry.frontmatter.tags);

                // Remove from memory index
                this.memoryIndex.remove(filePath);
            }

        } catch (error) {
            console.error(`Failed to handle file deletion for ${uri.fsPath}: ${error}`);
            // Don't throw - we want to continue processing other files
        }
    }

    /**
     * Synchronizes a batch of files
     * Useful for initial loading or bulk operations
     * @param uris Array of file URIs to synchronize
     */
    public async synchronizeBatch(uris: vscode.Uri[]): Promise<void> {
        const promises = uris.map(uri => this.handleFileCreateOrChange(uri));
        await Promise.allSettled(promises);
    }

    /**
     * Clears all synchronized data
     */
    public clear(): void {
        this.memoryIndex.clear();
        this.tagSystem.clear();
    }
}
