/**
 * Represents a parsed Markdown link
 */
export interface ParsedLink {
    /** The display text of the link */
    text: string;
    /** The path/URL of the link */
    path: string;
    /** The original full link syntax, e.g., [text](path) */
    fullSyntax: string;
    /** The starting index of the link in the content */
    startIndex: number;
    /** The ending index of the link in the content */
    endIndex: number;
}

/**
 * Parser for extracting Markdown links from content
 */
export class MarkdownLinkParser {
    // Regex pattern to match Markdown links: [text](path)
    // This handles:
    // - Text with spaces, special chars, etc.
    // - Paths with spaces, dots, slashes, etc.
    // - Does not match image links (![text](path))
    private static readonly LINK_PATTERN = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;

    /**
     * Parses a string of Markdown content and extracts all links
     * @param content The Markdown content to parse
     * @returns Array of parsed link objects
     */
    public static parse(content: string): ParsedLink[] {
        const links: ParsedLink[] = [];

        // Reset regex state
        this.LINK_PATTERN.lastIndex = 0;

        let match: RegExpExecArray | null;

        while ((match = this.LINK_PATTERN.exec(content)) !== null) {
            const fullSyntax = match[0];
            const text = match[1];
            const path = match[2];
            const startIndex = match.index;
            const endIndex = match.index + fullSyntax.length;

            links.push({
                text,
                path,
                fullSyntax,
                startIndex,
                endIndex
            });
        }

        return links;
    }

    /**
     * Checks if a path is a relative path
     * @param path The path to check
     * @returns True if the path is relative
     */
    public static isRelativePath(path: string): boolean {
        // Check if path starts with ./ or ../
        return path.startsWith('./') || path.startsWith('../');
    }

    /**
     * Checks if a path is an absolute file path (not a URL)
     * @param path The path to check
     * @returns True if the path is an absolute file path
     */
    public static isAbsolutePath(path: string): boolean {
        // Check if path starts with / or drive letter (e.g., C:/)
        return path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path);
    }

    /**
     * Checks if a path is a URL
     * @param path The path to check
     * @returns True if the path is a URL
     */
    public static isUrl(path: string): boolean {
        return path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//');
    }
}
