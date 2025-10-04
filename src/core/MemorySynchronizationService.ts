import * as vscode from 'vscode';
import { MemoryFileParser } from './MemoryFileParser';
import { MemoryIndex } from './MemoryIndex';
import { TagSystem } from './TagSystem';
import { ErrorReporter } from './ErrorReporter';

/**
 * Service for synchronizing the in-memory index with file system changes
 */
export class MemorySynchronizationService {
    private errorReporter: ErrorReporter;

    constructor(
        private memoryIndex: MemoryIndex,
        private tagSystem: TagSystem
    ) {
        this.errorReporter = ErrorReporter.getInstance();
    }

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
            // Non-intrusive error reporting - no modal dialogs
            this.errorReporter.reportError(
                'Failed to process memory file',
                uri.fsPath,
                error instanceof Error ? error.message : String(error)
            );
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
            // Non-intrusive error reporting - no modal dialogs
            this.errorReporter.reportError(
                'Failed to handle file deletion',
                uri.fsPath,
                error instanceof Error ? error.message : String(error)
            );
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
     * Refreshes a single file in the memory index
     * Reads and updates the file if it exists, removes it if it doesn't
     * @param filePath The file path to refresh
     */
    public async refreshFile(filePath: string): Promise<void> {
        try {
            // Create URI from file path
            const uri = vscode.Uri.file(filePath);

            // Try to read the file to check if it exists
            try {
                const fileContent = await vscode.workspace.fs.readFile(uri);
                const content = Buffer.from(fileContent).toString('utf8');

                // Parse the file
                const parsed = MemoryFileParser.parse(content);

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

            } catch {
                // File doesn't exist or can't be read - remove from index if present
                const entry = this.memoryIndex.get(filePath);
                if (entry) {
                    this.tagSystem.removeTags(filePath, entry.frontmatter.tags);
                    this.memoryIndex.remove(filePath);
                }
            }

        } catch (error) {
            // Non-intrusive error reporting - no modal dialogs
            this.errorReporter.reportError(
                'Failed to refresh memory file',
                filePath,
                error instanceof Error ? error.message : String(error)
            );
            // Don't throw - we want to continue processing
        }
    }

    /**
     * Clears all synchronized data
     */
    public clear(): void {
        this.memoryIndex.clear();
        this.tagSystem.clear();
    }
}
