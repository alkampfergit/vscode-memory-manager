import * as path from 'path';
import * as fs from 'fs';
import { ParsedLink } from './MarkdownLinkParser';

/**
 * Result of resolving a single link
 */
export interface ResolvedLink {
    /** The original link path */
    originalPath: string;
    /** The resolved absolute path (or null if resolution failed) */
    resolvedPath: string | null;
    /** The content of the linked file (or null if reading failed) */
    content: string | null;
    /** Error message if resolution or reading failed */
    error?: string;
}

/**
 * Service for resolving Markdown links and reading their content
 */
export class LinkResolutionService {
    /**
     * Resolves a list of parsed links relative to a base file path
     * @param baseFilePath The absolute path of the file containing the links
     * @param links The parsed links to resolve
     * @returns Map of original link paths to resolved link information
     */
    public async resolveLinks(
        baseFilePath: string,
        links: ParsedLink[]
    ): Promise<Map<string, ResolvedLink>> {
        const results = new Map<string, ResolvedLink>();
        const baseDir = path.dirname(baseFilePath);

        for (const link of links) {
            // Skip URLs - we only resolve local file paths
            if (this.isUrl(link.path)) {
                results.set(link.path, {
                    originalPath: link.path,
                    resolvedPath: null,
                    content: null,
                    error: 'URLs are not resolved'
                });
                continue;
            }

            try {
                // Resolve the path relative to the base file's directory
                const resolvedPath = this.isAbsolutePath(link.path)
                    ? link.path
                    : path.resolve(baseDir, link.path);

                // Read the file content
                const content = await this.readFileContent(resolvedPath);

                results.set(link.path, {
                    originalPath: link.path,
                    resolvedPath,
                    content
                });
            } catch (error) {
                results.set(link.path, {
                    originalPath: link.path,
                    resolvedPath: null,
                    content: null,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        return results;
    }

    /**
     * Reads the content of a file
     * @param filePath The absolute path to the file
     * @returns The file content
     */
    private async readFileContent(filePath: string): Promise<string> {
        try {
            // Check if file exists
            await fs.promises.access(filePath, fs.constants.R_OK);

            // Read file content
            return await fs.promises.readFile(filePath, 'utf-8');
        } catch (error) {
            throw new Error(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Checks if a path is a URL
     * @param path The path to check
     * @returns True if the path is a URL
     */
    private isUrl(path: string): boolean {
        return path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//');
    }

    /**
     * Checks if a path is an absolute path
     * @param path The path to check
     * @returns True if the path is absolute
     */
    private isAbsolutePath(path: string): boolean {
        return path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path);
    }
}
