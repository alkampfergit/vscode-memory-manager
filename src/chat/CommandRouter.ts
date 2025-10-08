/**
 * Parses and extracts tag patterns from chat commands
 */
export class CommandRouter {
    /**
     * Extracts the tag patterns and remaining prompt from a memory-tag command
     * Parse ONLY the first line for tag extraction, everything else is the user prompt
     * @param prompt The full prompt text
     * @returns Object containing tag patterns array and the remaining prompt
     */
    public static parseMemoryTagCommand(prompt: string): { tags: string[], remainingPrompt: string } {
        // Trim leading/trailing whitespace
        const trimmedPrompt = prompt.trim();

        if (!trimmedPrompt) {
            return { tags: [], remainingPrompt: '' };
        }

        // Split into lines
        const lines = trimmedPrompt.split('\n');

        // Parse ONLY the first line for tags
        const firstLine = lines[0].trim();

        // Remove #memory-tag prefix if present
        const tagLine = firstLine.replace(/^#memory-tag\s*/i, '').trim();

        // Parse tags from the first line
        const tags = this.parseTags(tagLine);

        // Everything except the first line is the actual user prompt
        const remainingPrompt = lines.slice(1).join('\n').trim();

        return { tags, remainingPrompt };
    }

    /**
     * Parses a comma or colon-separated list of tags
     * @param tagsString The string containing tags
     * @returns Array of tag patterns
     */
    private static parseTags(tagsString: string): string[] {
        if (!tagsString) {
            return [];
        }

        // Split by comma or colon, then trim and filter empty strings
        return tagsString
            .split(/[,:]+/)
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
    }

    /**
     * Legacy method for backward compatibility
     * @param prompt The full prompt text
     * @returns The first tag pattern, or empty string if not found
     * @deprecated Use parseMemoryTagCommand instead
     */
    public static parseMemoryTagCommandLegacy(prompt: string): string {
        const result = this.parseMemoryTagCommand(prompt);
        return result.tags.length > 0 ? result.tags[0] : '';
    }
}
