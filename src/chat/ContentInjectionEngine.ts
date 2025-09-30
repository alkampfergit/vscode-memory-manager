import { MemoryIndex } from '../core/MemoryIndex';
import { TagSystem } from '../core/TagSystem';

/**
 * Retrieves and prepares memory content for injection into chat
 */
export class ContentInjectionEngine {
    constructor(
        private memoryIndex: MemoryIndex,
        private tagSystem: TagSystem
    ) {}

    /**
     * Retrieves memory content based on a tag pattern
     * @param tagPattern The tag pattern to search for (supports wildcards)
     * @returns Concatenated content of all matching memories
     */
    public getContentByTag(tagPattern: string): string {
        // Query files using the tag system (supports wildcards like backend.* or *.postgres)
        const filePaths = tagPattern.includes('*')
            ? this.tagSystem.queryByWildcard(tagPattern)
            : this.tagSystem.queryByTag(tagPattern);

        if (filePaths.length === 0) {
            return `No memories found with tag: ${tagPattern}`;
        }

        // Retrieve content from all matching files
        const contents: string[] = [];
        for (const filePath of filePaths) {
            const entry = this.memoryIndex.get(filePath);
            if (entry) {
                contents.push(`# ${entry.frontmatter.title}\n\n${entry.content}`);
            }
        }

        return contents.join('\n\n---\n\n');
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
}
