/**
 * Parses and extracts tag patterns from chat commands
 */
export class CommandRouter {
    /**
     * Extracts the tag pattern from a memory-tag command prompt
     * @param prompt The full prompt text
     * @returns The extracted tag pattern, or empty string if not found
     */
    public static parseMemoryTagCommand(prompt: string): string {
        // Trim leading/trailing whitespace
        const trimmedPrompt = prompt.trim();

        // Return the tag pattern (everything after #memory-tag)
        return trimmedPrompt;
    }
}
