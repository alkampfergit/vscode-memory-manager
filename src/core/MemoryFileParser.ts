import * as yaml from 'js-yaml';

/**
 * Represents the frontmatter metadata of a memory file
 */
export interface MemoryFileFrontmatter {
    title: string;
    tags: string[];
    priority?: string | number;
    created?: string;
    updated?: string;
    [key: string]: any; // Allow custom fields
}

/**
 * Represents the result of parsing a memory file
 */
export interface ParsedMemoryFile {
    frontmatter: MemoryFileFrontmatter;
    content: string;
}

/**
 * Error thrown when frontmatter validation fails
 */
export class FrontmatterValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FrontmatterValidationError';
    }
}

/**
 * Error thrown when frontmatter parsing fails
 */
export class FrontmatterParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FrontmatterParseError';
    }
}

/**
 * Parser for memory files with YAML frontmatter
 */
export class MemoryFileParser {
    private static readonly FRONTMATTER_DELIMITER = '---';

    /**
     * Parses a memory file content into frontmatter and markdown content
     * @param content The full content of the memory file
     * @returns Parsed frontmatter and content
     * @throws {FrontmatterParseError} If the file doesn't contain valid frontmatter
     * @throws {FrontmatterValidationError} If the frontmatter is missing required fields
     */
    public static parse(content: string): ParsedMemoryFile {
        const { yamlContent, markdownContent } = this.extractFrontmatter(content);

        const frontmatter = this.parseFrontmatter(yamlContent);
        this.validateFrontmatter(frontmatter);

        return {
            frontmatter,
            content: markdownContent
        };
    }

    /**
     * Extracts the YAML frontmatter and markdown content from the file
     */
    private static extractFrontmatter(content: string): { yamlContent: string; markdownContent: string } {
        const lines = content.split('\n');

        // Check if file starts with frontmatter delimiter
        if (lines[0].trim() !== this.FRONTMATTER_DELIMITER) {
            throw new FrontmatterParseError('File does not start with YAML frontmatter delimiter (---)');
        }

        // Find the closing delimiter
        let closingDelimiterIndex = -1;
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === this.FRONTMATTER_DELIMITER) {
                closingDelimiterIndex = i;
                break;
            }
        }

        if (closingDelimiterIndex === -1) {
            throw new FrontmatterParseError('Could not find closing frontmatter delimiter (---)');
        }

        // Extract YAML content (between delimiters)
        const yamlContent = lines.slice(1, closingDelimiterIndex).join('\n');

        // Extract markdown content (after closing delimiter)
        const markdownContent = lines.slice(closingDelimiterIndex + 1).join('\n').trim();

        return { yamlContent, markdownContent };
    }

    /**
     * Parses YAML content into a JavaScript object
     */
    private static parseFrontmatter(yamlContent: string): any {
        try {
            const parsed = yaml.load(yamlContent);

            if (parsed === null || parsed === undefined) {
                throw new FrontmatterParseError('YAML frontmatter is empty');
            }

            if (typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new FrontmatterParseError('YAML frontmatter must be an object');
            }

            return parsed;
        } catch (error) {
            if (error instanceof FrontmatterParseError) {
                throw error;
            }
            throw new FrontmatterParseError(`Failed to parse YAML: ${(error as Error).message}`);
        }
    }

    /**
     * Validates that the frontmatter contains required fields
     */
    private static validateFrontmatter(frontmatter: any): asserts frontmatter is MemoryFileFrontmatter {
        // Check for title
        if (!frontmatter.title) {
            throw new FrontmatterValidationError('Missing required field: title');
        }

        if (typeof frontmatter.title !== 'string') {
            throw new FrontmatterValidationError('Field "title" must be a string');
        }

        // Check for tags
        if (!frontmatter.tags) {
            throw new FrontmatterValidationError('Missing required field: tags');
        }

        if (!Array.isArray(frontmatter.tags)) {
            throw new FrontmatterValidationError('Field "tags" must be an array');
        }

        if (frontmatter.tags.length === 0) {
            throw new FrontmatterValidationError('Field "tags" must contain at least one tag');
        }

        // Validate that all tags are strings
        for (const tag of frontmatter.tags) {
            if (typeof tag !== 'string') {
                throw new FrontmatterValidationError('All tags must be strings');
            }
        }
    }
}
