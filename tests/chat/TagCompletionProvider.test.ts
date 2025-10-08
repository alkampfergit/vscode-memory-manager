import * as vscode from 'vscode';
import { TagCompletionProvider } from '../../src/chat/TagCompletionProvider';
import { TagSystem } from '../../src/core/TagSystem';
import { MemoryIndex } from '../../src/core/MemoryIndex';

describe('TagCompletionProvider', () => {
    let tagSystem: TagSystem;
    let memoryIndex: MemoryIndex;
    let provider: TagCompletionProvider;
    let mockDocument: vscode.TextDocument;
    let mockToken: vscode.CancellationToken;
    let mockContext: vscode.CompletionContext;

    beforeEach(() => {
        tagSystem = new TagSystem();
        memoryIndex = new MemoryIndex();
        provider = new TagCompletionProvider(tagSystem, memoryIndex);

        // Mock cancellation token
        mockToken = {
            isCancellationRequested: false,
            onCancellationRequested: jest.fn()
        } as any;

        // Mock completion context
        mockContext = {
            triggerKind: vscode.CompletionTriggerKind.Invoke,
            triggerCharacter: undefined
        };

        // Setup some test data
        tagSystem.addTags('/path/to/file1.md', ['backend.database.postgres', 'backend.database.mysql']);
        tagSystem.addTags('/path/to/file2.md', ['backend.auth', 'backend.database.postgres']);
        tagSystem.addTags('/path/to/file3.md', ['frontend.ui', 'frontend.components']);
        tagSystem.addTags('/path/to/file4.md', ['api.rest', 'api.graphql']);
    });

    // Helper to create mock document
    const createMockDocument = (lineText: string, cursorPosition: number): vscode.TextDocument => {
        return {
            lineAt: (line: number) => ({
                text: lineText,
                lineNumber: line,
                range: new vscode.Range(line, 0, line, lineText.length),
                rangeIncludingLineBreak: new vscode.Range(line, 0, line + 1, 0),
                firstNonWhitespaceCharacterIndex: 0,
                isEmptyOrWhitespace: lineText.trim().length === 0
            }),
            lineCount: 1,
            getText: () => lineText
        } as any;
    };

    describe('Story 1: IntelliSense for Tag Autocompletion', () => {
        it('should provide completions when typing @memory /memory-tag command', () => {
            const document = createMockDocument('@memory /memory-tag ', 21);
            const position = new vscode.Position(0, 21);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            expect(items!.length).toBeGreaterThan(0);
        });

        it('should return undefined when not in memory-tag command context', () => {
            const document = createMockDocument('just some text', 10);
            const position = new vscode.Position(0, 10);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeUndefined();
        });

        it('should provide all available tags when no input is provided', () => {
            const document = createMockDocument('@memory /memory-tag ', 21);
            const position = new vscode.Position(0, 21);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const labels = items!.map(item => item.label);
            expect(labels).toContain('backend.database.postgres');
            expect(labels).toContain('backend.auth');
            expect(labels).toContain('frontend.ui');
            expect(labels).toContain('api.rest');
        });

        it('should create completion items with correct properties', () => {
            const document = createMockDocument('@memory /memory-tag ', 21);
            const position = new vscode.Position(0, 21);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            expect(items!.length).toBeGreaterThan(0);

            const firstItem = items![0];
            expect(firstItem.kind).toBe(vscode.CompletionItemKind.Value);
            expect(firstItem.insertText).toBeDefined();
            expect(firstItem.detail).toBeDefined();
        });
    });

    describe('Story 2: Hierarchical Navigation in Completions', () => {
        it('should show next level subtags when input ends with dot', () => {
            const document = createMockDocument('@memory /memory-tag backend.', 29);
            const position = new vscode.Position(0, 29);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const labels = items!.map(item => typeof item.label === 'string' ? item.label : item.label.label);
            expect(labels).toContain('database');
            expect(labels).toContain('auth');
            // Should not show full paths
            expect(labels).not.toContain('backend.database.postgres');
        });

        it('should filter to next level only for hierarchical tags', () => {
            const document = createMockDocument('@memory /memory-tag backend.database.', 38);
            const position = new vscode.Position(0, 38);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const labels = items!.map(item => typeof item.label === 'string' ? item.label : item.label.label);
            expect(labels).toContain('postgres');
            expect(labels).toContain('mysql');
        });

        it('should set insertText to only the next part of the tag', () => {
            const document = createMockDocument('@memory /memory-tag backend.', 29);
            const position = new vscode.Position(0, 29);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const databaseItem = items!.find(item => {
                const label = typeof item.label === 'string' ? item.label : item.label.label;
                return label === 'database';
            });

            expect(databaseItem).toBeDefined();
            expect(databaseItem!.insertText).toBe('database');
        });

        it('should set filterText to full tag path for continued filtering', () => {
            const document = createMockDocument('@memory /memory-tag backend.', 29);
            const position = new vscode.Position(0, 29);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const databaseItem = items!.find(item => {
                const label = typeof item.label === 'string' ? item.label : item.label.label;
                return label === 'database';
            });

            expect(databaseItem).toBeDefined();
            expect(databaseItem!.filterText).toBe('backend.database');
        });
    });

    describe('Story 3: Fuzzy Matching for Tag Suggestions', () => {
        it('should match tags using fuzzy matching', () => {
            const document = createMockDocument('@memory /memory-tag post', 25);
            const position = new vscode.Position(0, 25);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const labels = items!.map(item => typeof item.label === 'string' ? item.label : item.label.label);
            // 'post' should match 'backend.database.postgres'
            expect(labels).toContain('backend.database.postgres');
        });

        it('should match characters in correct order', () => {
            const document = createMockDocument('@memory /memory-tag bkd', 24);
            const position = new vscode.Position(0, 24);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const labels = items!.map(item => typeof item.label === 'string' ? item.label : item.label.label);
            // 'bkd' should match 'backend.database'
            expect(labels.some(label => label.includes('backend'))).toBe(true);
        });

        it('should not match when characters are out of order', () => {
            const document = createMockDocument('@memory /memory-tag xyz', 24);
            const position = new vscode.Position(0, 24);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            // Should not match any tags
            expect(items!.length).toBe(0);
        });

        it('should rank better matches higher', () => {
            const document = createMockDocument('@memory /memory-tag back', 25);
            const position = new vscode.Position(0, 25);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            expect(items!.length).toBeGreaterThan(0);

            // First result should be a backend tag
            const firstLabel = typeof items![0].label === 'string' ? items![0].label : items![0].label.label;
            expect(firstLabel).toContain('backend');
        });
    });

    describe('Story 4: Wildcard Preview in Completions', () => {
        it('should add wildcard completion item when input ends with dot', () => {
            const document = createMockDocument('@memory /memory-tag backend.', 29);
            const position = new vscode.Position(0, 29);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const wildcardItem = items!.find(item => {
                const label = typeof item.label === 'string' ? item.label : item.label.label;
                return label.includes('*') && label.includes('All backend tags');
            });

            expect(wildcardItem).toBeDefined();
        });

        it('should set wildcard insertText to asterisk', () => {
            const document = createMockDocument('@memory /memory-tag backend.', 29);
            const position = new vscode.Position(0, 29);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const wildcardItem = items!.find(item => {
                const label = typeof item.label === 'string' ? item.label : item.label.label;
                return label.includes('*');
            });

            expect(wildcardItem).toBeDefined();
            expect(wildcardItem!.insertText).toBe('*');
        });

        it('should show descriptive label for wildcard item', () => {
            const document = createMockDocument('@memory /memory-tag frontend.', 30);
            const position = new vscode.Position(0, 30);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const wildcardItem = items!.find(item => {
                const label = typeof item.label === 'string' ? item.label : item.label.label;
                return label.includes('*');
            });

            expect(wildcardItem).toBeDefined();
            const label = typeof wildcardItem!.label === 'string' ? wildcardItem!.label : wildcardItem!.label.label;
            expect(label).toContain('All frontend tags');
        });

        it('should have high priority sort text for wildcard', () => {
            const document = createMockDocument('@memory /memory-tag backend.', 29);
            const position = new vscode.Position(0, 29);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const wildcardItem = items!.find(item => {
                const label = typeof item.label === 'string' ? item.label : item.label.label;
                return label.includes('*');
            });

            expect(wildcardItem).toBeDefined();
            expect(wildcardItem!.sortText).toBe('!');
        });
    });

    describe('Story 5: Usage Hints (File Counts)', () => {
        it('should show file count in completion item detail', () => {
            const document = createMockDocument('@memory /memory-tag ', 21);
            const position = new vscode.Position(0, 21);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const postgresItem = items!.find(item => {
                const label = typeof item.label === 'string' ? item.label : item.label.label;
                return label === 'backend.database.postgres';
            });

            expect(postgresItem).toBeDefined();
            // 2 files have backend.database.postgres tag
            expect(postgresItem!.detail).toContain('2');
            expect(postgresItem!.detail).toContain('memories');
        });

        it('should show singular "memory" for single file', () => {
            const document = createMockDocument('@memory /memory-tag ', 21);
            const position = new vscode.Position(0, 21);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const authItem = items!.find(item => {
                const label = typeof item.label === 'string' ? item.label : item.label.label;
                return label === 'backend.auth';
            });

            expect(authItem).toBeDefined();
            // 1 file has backend.auth tag
            expect(authItem!.detail).toContain('1');
            expect(authItem!.detail).toContain('memory');
            expect(authItem!.detail).not.toContain('memories');
        });

        it('should show correct file count for hierarchical tags', () => {
            const document = createMockDocument('@memory /memory-tag backend.', 29);
            const position = new vscode.Position(0, 29);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const databaseItem = items!.find(item => {
                const label = typeof item.label === 'string' ? item.label : item.label.label;
                return label === 'database';
            });

            expect(databaseItem).toBeDefined();
            expect(databaseItem!.detail).toBeDefined();
            expect(databaseItem!.detail).toMatch(/\d+ memor(y|ies)/);
        });
    });

    describe('Story 6: Recent Tags Prioritization', () => {
        it('should track recently used tags', () => {
            provider.addRecentTag('backend.auth');
            provider.addRecentTag('frontend.ui');

            const recentTags = provider.getRecentTags();

            expect(recentTags).toContain('backend.auth');
            expect(recentTags).toContain('frontend.ui');
        });

        it('should prioritize recent tags at the beginning of list', () => {
            provider.addRecentTag('api.rest');
            provider.addRecentTag('frontend.ui');

            const recentTags = provider.getRecentTags();

            expect(recentTags[0]).toBe('frontend.ui');
            expect(recentTags[1]).toBe('api.rest');
        });

        it('should move recently used tag to front if already exists', () => {
            provider.addRecentTag('backend.auth');
            provider.addRecentTag('frontend.ui');
            provider.addRecentTag('backend.auth'); // Add again

            const recentTags = provider.getRecentTags();

            expect(recentTags[0]).toBe('backend.auth');
            expect(recentTags.length).toBe(2); // Should not duplicate
        });

        it('should limit recent tags to max size', () => {
            // Add more than maxRecentTags (10)
            for (let i = 0; i < 15; i++) {
                provider.addRecentTag(`tag${i}`);
            }

            const recentTags = provider.getRecentTags();

            expect(recentTags.length).toBeLessThanOrEqual(10);
        });

        it('should give recent tags higher priority in sortText', () => {
            provider.addRecentTag('backend.auth');

            const document = createMockDocument('@memory /memory-tag ', 21);
            const position = new vscode.Position(0, 21);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            const authItem = items!.find(item => {
                const label = typeof item.label === 'string' ? item.label : item.label.label;
                return label === 'backend.auth';
            });
            const nonRecentItem = items!.find(item => {
                const label = typeof item.label === 'string' ? item.label : item.label.label;
                return label === 'api.rest';
            });

            expect(authItem).toBeDefined();
            expect(nonRecentItem).toBeDefined();

            // Recent tag should have lower sortText (higher priority)
            expect(authItem!.sortText!.charAt(0)).toBe('0');
            expect(nonRecentItem!.sortText!.charAt(0)).toBe('1');
        });

        it('should maintain priority order for multiple recent tags', () => {
            provider.addRecentTag('api.rest');
            provider.addRecentTag('frontend.ui');
            provider.addRecentTag('backend.auth');

            const document = createMockDocument('@memory /memory-tag ', 21);
            const position = new vscode.Position(0, 21);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();

            const sortedRecent = items!
                .filter(item => {
                    const label = typeof item.label === 'string' ? item.label : item.label.label;
                    return ['backend.auth', 'frontend.ui', 'api.rest'].includes(label as string);
                })
                .sort((a, b) => (a.sortText || '').localeCompare(b.sortText || ''));

            // Most recent should be first
            const firstLabel = typeof sortedRecent[0].label === 'string'
                ? sortedRecent[0].label
                : sortedRecent[0].label.label;
            expect(firstLabel).toBe('backend.auth');
        });
    });

    describe('Integration Tests', () => {
        it('should work with all features combined', () => {
            // Add recent tag
            provider.addRecentTag('backend.database.postgres');

            const document = createMockDocument('@memory /memory-tag backend.', 29);
            const position = new vscode.Position(0, 29);

            const items = provider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            expect(items!.length).toBeGreaterThan(0);

            // Should have hierarchical navigation
            const labels = items!.map(item => typeof item.label === 'string' ? item.label : item.label.label);
            expect(labels).toContain('database');
            expect(labels).toContain('auth');

            // Should have wildcard
            expect(labels.some(label => label.includes('*'))).toBe(true);

            // Should have usage hints
            const databaseItem = items!.find(item => {
                const label = typeof item.label === 'string' ? item.label : item.label.label;
                return label === 'database';
            });
            expect(databaseItem!.detail).toMatch(/\d+ memor(y|ies)/);
        });

        it('should handle empty tag system gracefully', () => {
            const emptyTagSystem = new TagSystem();
            const emptyProvider = new TagCompletionProvider(emptyTagSystem, memoryIndex);

            const document = createMockDocument('@memory /memory-tag ', 21);
            const position = new vscode.Position(0, 21);

            const items = emptyProvider.provideCompletionItems(document, position, mockToken, mockContext);

            expect(items).toBeDefined();
            expect(items!.length).toBe(0);
        });
    });
});
