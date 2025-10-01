import * as vscode from 'vscode';
import { MemoryIndex } from '../core/MemoryIndex';
import { TagSystem } from '../core/TagSystem';

/**
 * Retrieves and injects memory content into Copilot Chat context
 */
export class ContentInjectionEngine {
    constructor(
        private memoryIndex: MemoryIndex,
        private tagSystem: TagSystem
    ) {}

    /**
     * Attaches memory files to Copilot Chat based on a tag pattern
     * @param tagPattern The tag pattern to search for (supports wildcards)
     * @returns Array of attached file paths for logging/debugging
     */
    public async attachFilesByTag(tagPattern: string): Promise<string[]> {
        // Query files using the tag system (supports wildcards like backend.* or *.postgres)
        const filePaths = tagPattern.includes('*')
            ? this.tagSystem.queryByWildcard(tagPattern)
            : this.tagSystem.queryByTag(tagPattern);

        if (filePaths.length === 0) {
            return [];
        }

        // Convert file paths to URIs
        const fileUris: vscode.Uri[] = filePaths.map(filePath => vscode.Uri.file(filePath));

        // Attach all files to Copilot Chat context
        await vscode.commands.executeCommand('github.copilot.chat.attachFile', ...fileUris);

        return filePaths;
    }

    /**
     * Attaches memory files to Copilot Chat based on multiple tag patterns
     * @param tagPatterns Array of tag patterns to search for (supports wildcards)
     * @returns Array of attached file paths for logging/debugging
     */
    public async attachFilesByTags(tagPatterns: string[]): Promise<string[]> {
        if (tagPatterns.length === 0) {
            return [];
        }

        // Collect all unique file paths from all tag patterns
        const allFilePaths = new Set<string>();

        for (const tagPattern of tagPatterns) {
            const filePaths = tagPattern.includes('*')
                ? this.tagSystem.queryByWildcard(tagPattern)
                : this.tagSystem.queryByTag(tagPattern);

            for (const filePath of filePaths) {
                allFilePaths.add(filePath);
            }
        }

        if (allFilePaths.size === 0) {
            return [];
        }

        // Convert file paths to URIs
        const fileUris: vscode.Uri[] = Array.from(allFilePaths).map(filePath => vscode.Uri.file(filePath));

        // Attach all files to Copilot Chat context
        await vscode.commands.executeCommand('github.copilot.chat.attachFile', ...fileUris);

        return Array.from(allFilePaths);
    }

    /**
     * Gets a summary of matched memories
     * @param tagPattern The tag pattern to search for
     * @returns Summary information about matched memories
     */
    public getMatchSummary(tagPattern: string): { count: number; filePaths: string[] } {
        const filePaths = tagPattern.includes('*')
            ? this.tagSystem.queryByWildcard(tagPattern)
            : this.tagSystem.queryByTag(tagPattern);

        return {
            count: filePaths.length,
            filePaths
        };
    }

    /**
     * Gets a summary of matched memories for multiple tag patterns
     * @param tagPatterns Array of tag patterns to search for
     * @returns Summary information about matched memories
     */
    public getMatchSummaryForTags(tagPatterns: string[]): { count: number; filePaths: string[]; tagPatterns: string[] } {
        const allFilePaths = new Set<string>();
        
        for (const tagPattern of tagPatterns) {
            const filePaths = tagPattern.includes('*')
                ? this.tagSystem.queryByWildcard(tagPattern)
                : this.tagSystem.queryByTag(tagPattern);
            
            for (const filePath of filePaths) {
                allFilePaths.add(filePath);
            }
        }

        return {
            count: allFilePaths.size,
            filePaths: Array.from(allFilePaths),
            tagPatterns
        };
    }
}
