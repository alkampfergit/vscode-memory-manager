import * as vscode from 'vscode';
import { MemoryIndex } from '../core/MemoryIndex';
import { TagSystem } from '../core/TagSystem';
import { MemoryFileParser } from '../core/MemoryFileParser';
import { MarkdownLinkParser } from '../core/MarkdownLinkParser';
import { LinkResolutionService } from '../core/LinkResolutionService';
import { Logger } from '../core/Logger';
import * as fs from 'fs';

/**
 * Retrieves and injects memory content into Copilot Chat context
 */
export class ContentInjectionEngine {
    private linkResolver: LinkResolutionService;

    constructor(
        private memoryIndex: MemoryIndex,
        private tagSystem: TagSystem
    ) {
        this.linkResolver = new LinkResolutionService();
    }

    /**
     * Attaches memory files to Copilot Chat based on a tag pattern
     * Also includes files referenced from the memory files using markdown links
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

        // Get all referenced files from the memory files
        const allFilePaths = await this.getAllFilesWithReferences(filePaths);

        // Convert file paths to URIs
        const fileUris: vscode.Uri[] = allFilePaths.map(filePath => vscode.Uri.file(filePath));

        // Attach all files to Copilot Chat context
        await vscode.commands.executeCommand('github.copilot.chat.attachFile', ...fileUris);

        return allFilePaths;
    }

    /**
     * Attaches memory files to Copilot Chat based on multiple tag patterns
     * Also includes files referenced from the memory files using markdown links
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

        // Get all referenced files from the memory files
        const allFilePathsWithReferences = await this.getAllFilesWithReferences(Array.from(allFilePaths));

        // Convert file paths to URIs
        const fileUris: vscode.Uri[] = allFilePathsWithReferences.map(filePath => vscode.Uri.file(filePath));

        // Attach all files to Copilot Chat context
        await vscode.commands.executeCommand('github.copilot.chat.attachFile', ...fileUris);

        return allFilePathsWithReferences;
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

    /**
     * Gets a summary of matched memories including referenced files for multiple tag patterns
     * @param tagPatterns Array of tag patterns to search for
     * @returns Summary information about matched memories including all referenced files
     */
    public async getMatchSummaryForTagsWithReferences(tagPatterns: string[]): Promise<{ count: number; filePaths: string[]; tagPatterns: string[] }> {
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
            return {
                count: 0,
                filePaths: [],
                tagPatterns
            };
        }

        // Get all referenced files from the memory files
        const allFilePathsWithReferences = await this.getAllFilesWithReferences(Array.from(allFilePaths));

        return {
            count: allFilePathsWithReferences.length,
            filePaths: allFilePathsWithReferences,
            tagPatterns
        };
    }

    /**
     * Reads memory files and extracts their content without YAML headers
     * Also resolves and processes Markdown links in the content
     * @param filePaths Array of file paths to read
     * @returns Array of objects containing file path and processed content
     */
    public async getMemoryContents(filePaths: string[]): Promise<Array<{ filePath: string; content: string; title: string }>> {
        const results: Array<{ filePath: string; content: string; title: string }> = [];

        for (const filePath of filePaths) {
            try {
                const fileContent = await fs.promises.readFile(filePath, 'utf-8');
                const parsed = MemoryFileParser.parse(fileContent);

                // Process links in the content
                const processedContent = await this.processLinksInContent(filePath, parsed.content);

                results.push({
                    filePath,
                    content: processedContent,
                    title: parsed.frontmatter.title
                });
            } catch (error) {
                Logger.getInstance().error(`Failed to read or parse memory file ${filePath}`, error);
                // Skip files that fail to parse
            }
        }

        return results;
    }

    /**
     * Extracts all referenced file paths from a memory file
     * Only includes files that are referenced directly (not recursively)
     * @param memoryFilePath The path to the memory file
     * @returns Array of absolute file paths that are referenced from this memory file
     */
    private async getReferencedFiles(memoryFilePath: string): Promise<string[]> {
        try {
            const fileContent = await fs.promises.readFile(memoryFilePath, 'utf-8');
            const parsed = MemoryFileParser.parse(fileContent);

            // Parse all markdown links from the content
            const links = MarkdownLinkParser.parse(parsed.content);

            if (links.length === 0) {
                return [];
            }

            // Resolve all links to get their absolute paths
            const resolvedLinks = await this.linkResolver.resolveLinks(memoryFilePath, links);

            // Collect all successfully resolved file paths
            const referencedPaths: string[] = [];
            for (const [, resolved] of resolvedLinks.entries()) {
                if (resolved.resolvedPath && !resolved.error) {
                    // Verify the file exists before adding it
                    try {
                        await fs.promises.access(resolved.resolvedPath, fs.constants.R_OK);
                        referencedPaths.push(resolved.resolvedPath);
                    } catch {
                        // Skip files that don't exist or can't be read
                        Logger.getInstance().warn(`Referenced file not accessible: ${resolved.resolvedPath}`);
                    }
                }
            }

            return referencedPaths;
        } catch (error) {
            Logger.getInstance().error(`Failed to extract referenced files from ${memoryFilePath}`, error);
            return [];
        }
    }

    /**
     * Gets all file paths including the original memory files and their directly referenced files
     * @param memoryFilePaths Array of memory file paths
     * @returns Array of all unique file paths (memory files + their references)
     */
    private async getAllFilesWithReferences(memoryFilePaths: string[]): Promise<string[]> {
        const allFiles = new Set<string>();

        // Add all original memory files
        for (const filePath of memoryFilePaths) {
            allFiles.add(filePath);
        }

        // For each memory file, get its referenced files
        for (const memoryFilePath of memoryFilePaths) {
            const referencedFiles = await this.getReferencedFiles(memoryFilePath);
            for (const referencedFile of referencedFiles) {
                allFiles.add(referencedFile);
            }
        }

        return Array.from(allFiles);
    }

    /**
     * Processes Markdown links in content: replaces links with text and appends linked content
     * @param baseFilePath The path of the file containing the links
     * @param content The content to process
     * @returns Processed content with links replaced and linked content appended
     */
    private async processLinksInContent(baseFilePath: string, content: string): Promise<string> {
        // Parse all links from the content
        const links = MarkdownLinkParser.parse(content);

        if (links.length === 0) {
            return content;
        }

        // Resolve all links
        const resolvedLinks = await this.linkResolver.resolveLinks(baseFilePath, links);

        // Replace links with their text (in reverse order to maintain indices)
        let processedContent = content;
        const sortedLinks = [...links].sort((a, b) => b.startIndex - a.startIndex);

        for (const link of sortedLinks) {
            const before = processedContent.substring(0, link.startIndex);
            const after = processedContent.substring(link.endIndex);
            processedContent = before + link.text + after;
        }

        // Append content from resolved links
        const linkedContents: string[] = [];

        for (const [linkPath, resolved] of resolvedLinks.entries()) {
            if (resolved.content) {
                linkedContents.push(`\n\n---\n\n**Linked Content from: ${linkPath}**\n\n${resolved.content}`);
            }
        }

        if (linkedContents.length > 0) {
            processedContent += linkedContents.join('');
        }

        return processedContent;
    }

    /**
     * Gets memory contents for files matching the given tag patterns
     * @param tagPatterns Array of tag patterns to search for
     * @returns Array of objects containing file path and stripped content
     */
    public async getMemoryContentsByTags(tagPatterns: string[]): Promise<Array<{ filePath: string; content: string; title: string }>> {
        const summary = this.getMatchSummaryForTags(tagPatterns);
        return this.getMemoryContents(summary.filePaths);
    }

    /**
     * Assembles memory contents into a clean, cohesive text block
     * Uses simple double newline separators without any headers or metadata
     * Per Feature 7, Story 2: Clean content assembly for seamless context
     *
     * @param memoryContents Array of memory content objects
     * @returns A single string with all contents joined by double newlines
     */
    public assembleCleanContent(memoryContents: Array<{ filePath: string; content: string; title: string }>): string {
        if (memoryContents.length === 0) {
            return '';
        }

        // Join content with simple double newline - no headers, separators, or metadata
        return memoryContents.map(memory => memory.content).join('\n\n');
    }

    /**
     * Gets memory contents and assembles them into a clean text block
     * @param tagPatterns Array of tag patterns to search for
     * @returns A single string with all matched memory contents
     */
    public async getAssembledContent(tagPatterns: string[]): Promise<string> {
        const memoryContents = await this.getMemoryContentsByTags(tagPatterns);
        return this.assembleCleanContent(memoryContents);
    }
}
