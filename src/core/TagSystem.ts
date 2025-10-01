/**
 * Represents a node in the hierarchical tag tree
 */
interface TagNode {
    name: string;
    fullPath: string;
    children: Map<string, TagNode>;
    filePaths: Set<string>;
}

/**
 * Hierarchical tag system for managing and querying tags
 */
export class TagSystem {
    private root: TagNode;
    private tagToFilesMap: Map<string, Set<string>>;

    constructor() {
        this.root = this.createNode('', '');
        this.tagToFilesMap = new Map();
    }

    /**
     * Creates a new tag node
     */
    private createNode(name: string, fullPath: string): TagNode {
        return {
            name,
            fullPath,
            children: new Map(),
            filePaths: new Set()
        };
    }

    /**
     * Adds tags for a specific file
     * @param filePath The file path
     * @param tags Array of tags (e.g., ["backend.database.postgres", "backend.connection-pool"])
     */
    public addTags(filePath: string, tags: string[]): void {
        for (const tag of tags) {
            this.addTag(filePath, tag);
        }
    }

    /**
     * Adds a single tag for a file
     */
    private addTag(filePath: string, tag: string): void {
        const parts = tag.split('.');
        let currentNode = this.root;
        let fullPath = '';

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            fullPath = fullPath ? `${fullPath}.${part}` : part;

            if (!currentNode.children.has(part)) {
                currentNode.children.set(part, this.createNode(part, fullPath));
            }

            currentNode = currentNode.children.get(part)!;
            currentNode.filePaths.add(filePath);

            // Add to tag-to-files map
            if (!this.tagToFilesMap.has(fullPath)) {
                this.tagToFilesMap.set(fullPath, new Set());
            }
            this.tagToFilesMap.get(fullPath)!.add(filePath);
        }
    }

    /**
     * Removes all tags for a file
     * @param filePath The file path
     * @param tags Array of tags to remove
     */
    public removeTags(filePath: string, tags: string[]): void {
        for (const tag of tags) {
            this.removeTag(filePath, tag);
        }
    }

    /**
     * Removes a single tag for a file
     */
    private removeTag(filePath: string, tag: string): void {
        const parts = tag.split('.');
        let currentNode = this.root;
        let fullPath = '';
        const nodes: TagNode[] = [];

        // Navigate to the tag node
        for (const part of parts) {
            fullPath = fullPath ? `${fullPath}.${part}` : part;

            if (!currentNode.children.has(part)) {
                return; // Tag doesn't exist
            }

            currentNode = currentNode.children.get(part)!;
            nodes.push(currentNode);

            // Remove from tag-to-files map
            const fileSet = this.tagToFilesMap.get(fullPath);
            if (fileSet) {
                fileSet.delete(filePath);
                if (fileSet.size === 0) {
                    this.tagToFilesMap.delete(fullPath);
                }
            }
        }

        // Remove filePath from all nodes in the path
        for (const node of nodes) {
            node.filePaths.delete(filePath);
        }
    }

    /**
     * Queries files by an exact tag match
     * @param tag The tag to search for (e.g., "backend.database")
     * @returns Array of file paths that have this tag
     */
    public queryByTag(tag: string): string[] {
        const fileSet = this.tagToFilesMap.get(tag);
        return fileSet ? Array.from(fileSet) : [];
    }

    /**
     * Queries files by a wildcard tag pattern
     * @param pattern The pattern to match (e.g., "backend.*", "*.postgres")
     * @returns Array of file paths that match the pattern
     */
    public queryByWildcard(pattern: string): string[] {
        const parts = pattern.split('.');
        const matchedFiles = new Set<string>();

        this.searchWithWildcard(this.root, parts, 0, matchedFiles);

        return Array.from(matchedFiles);
    }

    /**
     * Recursively searches the tag tree with wildcard support
     */
    private searchWithWildcard(
        node: TagNode,
        patternParts: string[],
        partIndex: number,
        matchedFiles: Set<string>
    ): void {
        if (partIndex >= patternParts.length) {
            // Reached the end of the pattern, add all files from this node
            node.filePaths.forEach(file => matchedFiles.add(file));
            return;
        }

        const currentPart = patternParts[partIndex];

        if (currentPart === '*') {
            // Wildcard matches any single level
            for (const child of node.children.values()) {
                this.searchWithWildcard(child, patternParts, partIndex + 1, matchedFiles);
            }
        } else if (currentPart === '**') {
            // Double wildcard matches any number of levels
            // Match current level
            this.searchWithWildcard(node, patternParts, partIndex + 1, matchedFiles);

            // Match all children recursively
            for (const child of node.children.values()) {
                this.searchWithWildcard(child, patternParts, partIndex, matchedFiles);
            }
        } else {
            // Exact match
            const child = node.children.get(currentPart);
            if (child) {
                this.searchWithWildcard(child, patternParts, partIndex + 1, matchedFiles);
            }
        }
    }

    /**
     * Gets all tags in the system
     * @returns Array of all tag paths
     */
    public getAllTags(): string[] {
        return Array.from(this.tagToFilesMap.keys());
    }

    /**
     * Gets all tags for a specific file
     * @param filePath The file path
     * @returns Array of tags for this file
     */
    public getTagsForFile(filePath: string): string[] {
        const tags: string[] = [];

        for (const [tag, files] of this.tagToFilesMap.entries()) {
            if (files.has(filePath)) {
                tags.push(tag);
            }
        }

        return tags;
    }

    /**
     * Clears all tags from the system
     */
    public clear(): void {
        this.root = this.createNode('', '');
        this.tagToFilesMap.clear();
    }

    /**
     * Gets the number of unique tags
     */
    public size(): number {
        return this.tagToFilesMap.size;
    }
}
