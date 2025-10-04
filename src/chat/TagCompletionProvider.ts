import * as vscode from 'vscode';
import { TagSystem } from '../core/TagSystem';
import { MemoryIndex } from '../core/MemoryIndex';

/**
 * Provides IntelliSense completion for memory tags in the chat input
 */
export class TagCompletionProvider implements vscode.CompletionItemProvider {
    private recentTags: string[] = [];
    private readonly maxRecentTags = 10;

    constructor(
        private readonly tagSystem: TagSystem,
        private readonly memoryIndex: MemoryIndex
    ) {}

    /**
     * Provides completion items for tag suggestions
     */
    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken,
        _context: vscode.CompletionContext
    ): vscode.CompletionItem[] | undefined {
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, position.character);

        // Check if we're in a memory-tag command context
        const memoryTagMatch = textBeforeCursor.match(/@memory\s+\/memory-tag\s+(.*)$/);
        if (!memoryTagMatch) {
            return undefined;
        }

        const tagInput = memoryTagMatch[1];
        const completionItems: vscode.CompletionItem[] = [];

        // Get all available tags
        const allTags = this.tagSystem.getAllTags();

        // Check if we're completing a hierarchical tag (ends with a dot)
        const endsWithDot = tagInput.endsWith('.');

        if (endsWithDot) {
            // Hierarchical navigation - show next level subtags
            const prefix = tagInput; // e.g., "backend."
            const hierarchicalItems = this.getHierarchicalCompletions(prefix, allTags);
            completionItems.push(...hierarchicalItems);

            // Add wildcard preview
            const wildcardItem = this.createWildcardCompletionItem(prefix);
            completionItems.push(wildcardItem);
        } else {
            // Regular completion with fuzzy matching
            const fuzzyItems = this.getFuzzyMatchedCompletions(tagInput, allTags);
            completionItems.push(...fuzzyItems);
        }

        return completionItems;
    }

    /**
     * Gets hierarchical completions for tags with a dot separator
     */
    private getHierarchicalCompletions(prefix: string, allTags: string[]): vscode.CompletionItem[] {
        const prefixParts = prefix.split('.');
        const completions: vscode.CompletionItem[] = [];
        const seenSubtags = new Set<string>();

        for (const tag of allTags) {
            if (tag.startsWith(prefix)) {
                const remainingPart = tag.substring(prefix.length);
                const nextPart = remainingPart.split('.')[0];

                if (nextPart && !seenSubtags.has(nextPart)) {
                    seenSubtags.add(nextPart);
                    const fullTag = prefix + nextPart;
                    const fileCount = this.getFileCountForTag(fullTag);

                    const item = new vscode.CompletionItem(nextPart, vscode.CompletionItemKind.Value);
                    item.insertText = nextPart;
                    item.filterText = fullTag;
                    item.detail = `(${fileCount} ${fileCount === 1 ? 'memory' : 'memories'})`;
                    item.documentation = new vscode.MarkdownString(`Tag: \`${fullTag}\``);

                    // Prioritize recent tags
                    item.sortText = this.getSortText(fullTag, nextPart);

                    completions.push(item);
                }
            }
        }

        return completions;
    }

    /**
     * Gets fuzzy matched completions for tag input
     */
    private getFuzzyMatchedCompletions(input: string, allTags: string[]): vscode.CompletionItem[] {
        if (!input) {
            // No input - show all tags
            return allTags.map(tag => this.createCompletionItem(tag));
        }

        // Fuzzy match tags
        const matchedTags = allTags
            .map(tag => ({
                tag,
                score: this.fuzzyMatch(input.toLowerCase(), tag.toLowerCase())
            }))
            .filter(result => result.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(result => result.tag);

        return matchedTags.map(tag => this.createCompletionItem(tag));
    }

    /**
     * Simple fuzzy matching algorithm
     * Returns a score > 0 if the input matches the tag, 0 otherwise
     */
    private fuzzyMatch(input: string, target: string): number {
        let inputIndex = 0;
        let targetIndex = 0;
        let score = 0;
        let consecutiveMatches = 0;

        while (inputIndex < input.length && targetIndex < target.length) {
            if (input[inputIndex] === target[targetIndex]) {
                score += 1 + consecutiveMatches;
                consecutiveMatches++;
                inputIndex++;
            } else {
                consecutiveMatches = 0;
            }
            targetIndex++;
        }

        // Return score only if all characters were matched
        return inputIndex === input.length ? score : 0;
    }

    /**
     * Creates a completion item for a tag
     */
    private createCompletionItem(tag: string): vscode.CompletionItem {
        const fileCount = this.getFileCountForTag(tag);

        const item = new vscode.CompletionItem(tag, vscode.CompletionItemKind.Value);
        item.insertText = tag;
        item.detail = `(${fileCount} ${fileCount === 1 ? 'memory' : 'memories'})`;
        item.documentation = new vscode.MarkdownString(`Tag: \`${tag}\``);

        // Prioritize recent tags
        item.sortText = this.getSortText(tag, tag);

        return item;
    }

    /**
     * Creates a wildcard completion item
     */
    private createWildcardCompletionItem(prefix: string): vscode.CompletionItem {
        const tagPrefix = prefix.substring(0, prefix.length - 1); // Remove trailing dot
        const item = new vscode.CompletionItem(
            `* (All ${tagPrefix} tags)`,
            vscode.CompletionItemKind.Value
        );
        item.insertText = '*';
        item.detail = 'Wildcard - matches all subtags';
        item.documentation = new vscode.MarkdownString(
            `Use \`${prefix}*\` to match all tags starting with \`${tagPrefix}\``
        );
        item.sortText = '!'; // Put at the top

        return item;
    }

    /**
     * Gets the file count for a specific tag
     */
    private getFileCountForTag(tag: string): number {
        const files = this.tagSystem.queryByTag(tag);
        return files.length;
    }

    /**
     * Gets the sort text for a completion item (prioritizing recent tags)
     */
    private getSortText(fullTag: string, displayText: string): string {
        const recentIndex = this.recentTags.indexOf(fullTag);
        if (recentIndex !== -1) {
            // Recent tags get priority (lower sort text = higher priority)
            return `0${recentIndex.toString().padStart(3, '0')}_${displayText}`;
        }
        // Non-recent tags
        return `1_${displayText}`;
    }

    /**
     * Adds a tag to the recent tags list
     */
    public addRecentTag(tag: string): void {
        // Remove if already exists
        const existingIndex = this.recentTags.indexOf(tag);
        if (existingIndex !== -1) {
            this.recentTags.splice(existingIndex, 1);
        }

        // Add to the beginning
        this.recentTags.unshift(tag);

        // Keep only the most recent tags
        if (this.recentTags.length > this.maxRecentTags) {
            this.recentTags = this.recentTags.slice(0, this.maxRecentTags);
        }
    }

    /**
     * Gets the list of recent tags
     */
    public getRecentTags(): string[] {
        return [...this.recentTags];
    }
}
