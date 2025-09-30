import { MemoryFileFrontmatter } from './MemoryFileParser';

/**
 * Represents a memory entry in the index
 */
export interface MemoryIndexEntry {
    filePath: string;
    frontmatter: MemoryFileFrontmatter;
    content: string;
    lastModified: Date;
}

/**
 * In-memory cache for storing parsed memory files
 */
export class MemoryIndex {
    private index: Map<string, MemoryIndexEntry>;

    constructor() {
        this.index = new Map();
    }

    /**
     * Adds or updates a memory entry in the index
     * @param filePath The file path (used as the key)
     * @param frontmatter The parsed frontmatter
     * @param content The markdown content
     */
    public add(filePath: string, frontmatter: MemoryFileFrontmatter, content: string): void {
        const entry: MemoryIndexEntry = {
            filePath,
            frontmatter,
            content,
            lastModified: new Date()
        };

        this.index.set(filePath, entry);
    }

    /**
     * Updates an existing memory entry in the index
     * @param filePath The file path
     * @param frontmatter The updated frontmatter
     * @param content The updated content
     * @returns true if the entry was updated, false if it didn't exist
     */
    public update(filePath: string, frontmatter: MemoryFileFrontmatter, content: string): boolean {
        if (!this.index.has(filePath)) {
            return false;
        }

        this.add(filePath, frontmatter, content);
        return true;
    }

    /**
     * Removes a memory entry from the index
     * @param filePath The file path
     * @returns true if the entry was removed, false if it didn't exist
     */
    public remove(filePath: string): boolean {
        return this.index.delete(filePath);
    }

    /**
     * Retrieves a memory entry by file path
     * @param filePath The file path
     * @returns The memory entry, or undefined if not found
     */
    public get(filePath: string): MemoryIndexEntry | undefined {
        return this.index.get(filePath);
    }

    /**
     * Checks if a memory entry exists in the index
     * @param filePath The file path
     * @returns true if the entry exists, false otherwise
     */
    public has(filePath: string): boolean {
        return this.index.has(filePath);
    }

    /**
     * Retrieves all memory entries
     * @returns Array of all memory entries
     */
    public getAll(): MemoryIndexEntry[] {
        return Array.from(this.index.values());
    }

    /**
     * Clears all entries from the index
     */
    public clear(): void {
        this.index.clear();
    }

    /**
     * Gets the number of entries in the index
     */
    public size(): number {
        return this.index.size;
    }

    /**
     * Gets all file paths in the index
     */
    public getFilePaths(): string[] {
        return Array.from(this.index.keys());
    }
}
