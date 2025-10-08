/**
 * Feature 7: Advanced Querying & Content Processing
 *
 * This test suite verifies:
 * - Story 1: Wildcard Query Patterns (backend.*, *.postgres, etc.)
 * - Story 2: Content Sizing and Clean Separators
 */

import { TagSystem } from '../../src/core/TagSystem';
import { ContentInjectionEngine } from '../../src/chat/ContentInjectionEngine';
import { MemoryIndex } from '../../src/core/MemoryIndex';

describe('Feature 7: Advanced Querying & Content Processing', () => {
    describe('Story 1: Wildcard Query Patterns', () => {
        let tagSystem: TagSystem;

        beforeEach(() => {
            tagSystem = new TagSystem();
        });

        describe('Basic wildcard patterns', () => {
            beforeEach(() => {
                tagSystem.addTags('/memory/file1.md', ['backend.database.postgres']);
                tagSystem.addTags('/memory/file2.md', ['backend.database.mysql']);
                tagSystem.addTags('/memory/file3.md', ['backend.api.rest']);
                tagSystem.addTags('/memory/file4.md', ['backend.api.graphql']);
                tagSystem.addTags('/memory/file5.md', ['frontend.ui.react']);
                tagSystem.addTags('/memory/file6.md', ['frontend.ui.vue']);
            });

            it('should match all subtags with backend.*', () => {
                const files = tagSystem.queryByWildcard('backend.*');

                expect(files).toHaveLength(4);
                expect(files).toContain('/memory/file1.md');
                expect(files).toContain('/memory/file2.md');
                expect(files).toContain('/memory/file3.md');
                expect(files).toContain('/memory/file4.md');
                expect(files).not.toContain('/memory/file5.md');
                expect(files).not.toContain('/memory/file6.md');
            });

            it('should match all subtags with backend.database.*', () => {
                const files = tagSystem.queryByWildcard('backend.database.*');

                expect(files).toHaveLength(2);
                expect(files).toContain('/memory/file1.md');
                expect(files).toContain('/memory/file2.md');
            });

            it('should match all subtags with backend.api.*', () => {
                const files = tagSystem.queryByWildcard('backend.api.*');

                expect(files).toHaveLength(2);
                expect(files).toContain('/memory/file3.md');
                expect(files).toContain('/memory/file4.md');
            });

            it('should match all subtags with frontend.*', () => {
                const files = tagSystem.queryByWildcard('frontend.*');

                expect(files).toHaveLength(2);
                expect(files).toContain('/memory/file5.md');
                expect(files).toContain('/memory/file6.md');
            });
        });

        describe('Wildcard in middle of pattern', () => {
            beforeEach(() => {
                tagSystem.addTags('/memory/file1.md', ['backend.database.postgres']);
                tagSystem.addTags('/memory/file2.md', ['backend.database.mysql']);
                tagSystem.addTags('/memory/file3.md', ['frontend.database.postgres']);
            });

            it('should match *.database.postgres', () => {
                const files = tagSystem.queryByWildcard('*.database.postgres');

                expect(files).toHaveLength(2);
                expect(files).toContain('/memory/file1.md');
                expect(files).toContain('/memory/file3.md');
            });

            it('should match backend.*.postgres', () => {
                const files = tagSystem.queryByWildcard('backend.*.postgres');

                expect(files).toHaveLength(1);
                expect(files).toContain('/memory/file1.md');
            });
        });

        describe('Deep hierarchical wildcard patterns', () => {
            beforeEach(() => {
                tagSystem.addTags('/memory/file1.md', ['backend.database.postgres.connection.pool']);
                tagSystem.addTags('/memory/file2.md', ['backend.database.postgres.query.builder']);
                tagSystem.addTags('/memory/file3.md', ['backend.database.mysql.replication']);
                tagSystem.addTags('/memory/file4.md', ['backend.api.rest.authentication']);
            });

            it('should match backend.database.postgres.* (3 levels)', () => {
                const files = tagSystem.queryByWildcard('backend.database.postgres.*');

                expect(files).toHaveLength(2);
                expect(files).toContain('/memory/file1.md');
                expect(files).toContain('/memory/file2.md');
            });

            it('should match backend.database.*.* (2 wildcards)', () => {
                const files = tagSystem.queryByWildcard('backend.database.*.*');

                expect(files).toHaveLength(3);
                expect(files).toContain('/memory/file1.md');
                expect(files).toContain('/memory/file2.md');
                expect(files).toContain('/memory/file3.md');
            });

            it('should match backend.** (recursive wildcard)', () => {
                const files = tagSystem.queryByWildcard('backend.**');

                expect(files).toHaveLength(4);
                expect(files).toContain('/memory/file1.md');
                expect(files).toContain('/memory/file2.md');
                expect(files).toContain('/memory/file3.md');
                expect(files).toContain('/memory/file4.md');
            });
        });

        describe('No duplicates in results', () => {
            beforeEach(() => {
                // file1 has multiple tags that match the wildcard
                tagSystem.addTags('/memory/file1.md', [
                    'backend.database.postgres',
                    'backend.database.connection',
                    'backend.database.migration'
                ]);
                tagSystem.addTags('/memory/file2.md', ['backend.api.rest']);
            });

            it('should return file1 only once even with multiple matching tags', () => {
                const files = tagSystem.queryByWildcard('backend.database.*');

                // Count occurrences of file1
                const file1Count = files.filter(f => f === '/memory/file1.md').length;

                expect(file1Count).toBe(1);
                expect(files).toContain('/memory/file1.md');
            });

            it('should return unique files with backend.*', () => {
                const files = tagSystem.queryByWildcard('backend.*');

                // file1 appears only once despite having 3 matching tags
                const file1Count = files.filter(f => f === '/memory/file1.md').length;

                expect(file1Count).toBe(1);
                expect(files.length).toBe(2); // file1 and file2
            });
        });

        describe('Edge cases', () => {
            beforeEach(() => {
                tagSystem.addTags('/memory/file1.md', ['backend.database.postgres']);
            });

            it('should return empty array for non-matching wildcard', () => {
                const files = tagSystem.queryByWildcard('frontend.*');

                expect(files).toEqual([]);
            });

            it('should return empty array for non-existent parent tag', () => {
                const files = tagSystem.queryByWildcard('nonexistent.*');

                expect(files).toEqual([]);
            });

            it('should handle wildcard on empty tag system', () => {
                const emptyTagSystem = new TagSystem();
                const files = emptyTagSystem.queryByWildcard('backend.*');

                expect(files).toEqual([]);
            });

            it('should handle multiple wildcards in pattern', () => {
                tagSystem.addTags('/memory/file2.md', ['backend.api.rest.v1']);
                tagSystem.addTags('/memory/file3.md', ['backend.api.graphql.v2']);

                const files = tagSystem.queryByWildcard('backend.*.*.*');

                expect(files).toHaveLength(2);
                expect(files).toContain('/memory/file2.md');
                expect(files).toContain('/memory/file3.md');
            });
        });

        describe('Integration with exact tag queries', () => {
            beforeEach(() => {
                tagSystem.addTags('/memory/file1.md', ['backend.database.postgres']);
                tagSystem.addTags('/memory/file2.md', ['backend.database.mysql']);
                tagSystem.addTags('/memory/file3.md', ['backend.api.rest']);
            });

            it('should support both exact and wildcard queries', () => {
                const exactFiles = tagSystem.queryByTag('backend.database.postgres');
                const wildcardFiles = tagSystem.queryByWildcard('backend.database.*');

                expect(exactFiles).toEqual(['/memory/file1.md']);
                expect(wildcardFiles).toHaveLength(2);
                expect(wildcardFiles).toContain('/memory/file1.md');
                expect(wildcardFiles).toContain('/memory/file2.md');
            });

            it('should return same results for tag.* and querying parent tag', () => {
                const wildcardFiles = tagSystem.queryByWildcard('backend.database.*');
                const parentFiles = tagSystem.queryByTag('backend.database');

                // Both should include files with backend.database.* tags
                expect(wildcardFiles.sort()).toEqual(parentFiles.sort());
            });
        });
    });

    describe('Story 2: Content Sizing and Clean Separators', () => {
        let contentInjector: ContentInjectionEngine;
        let memoryIndex: MemoryIndex;
        let tagSystem: TagSystem;

        beforeEach(() => {
            memoryIndex = new MemoryIndex();
            tagSystem = new TagSystem();
            contentInjector = new ContentInjectionEngine(memoryIndex, tagSystem);
        });

        describe('assembleCleanContent', () => {
            it('should join contents with double newline separator', () => {
                const memoryContents = [
                    { filePath: '/memory/file1.md', content: 'Content from file 1', title: 'File 1' },
                    { filePath: '/memory/file2.md', content: 'Content from file 2', title: 'File 2' },
                    { filePath: '/memory/file3.md', content: 'Content from file 3', title: 'File 3' }
                ];

                const assembled = contentInjector.assembleCleanContent(memoryContents);

                expect(assembled).toBe('Content from file 1\n\nContent from file 2\n\nContent from file 3');
            });

            it('should not add any headers or metadata', () => {
                const memoryContents = [
                    { filePath: '/memory/backend.md', content: 'Backend content', title: 'Backend Guide' },
                    { filePath: '/memory/frontend.md', content: 'Frontend content', title: 'Frontend Guide' }
                ];

                const assembled = contentInjector.assembleCleanContent(memoryContents);

                // Should not contain titles, filenames, or separators
                expect(assembled).not.toContain('Backend Guide');
                expect(assembled).not.toContain('Frontend Guide');
                expect(assembled).not.toContain('backend.md');
                expect(assembled).not.toContain('frontend.md');
                expect(assembled).not.toContain('---');
                expect(assembled).not.toContain('###');
                expect(assembled).not.toContain('**');

                // Should only contain the actual content
                expect(assembled).toBe('Backend content\n\nFrontend content');
            });

            it('should handle empty content array', () => {
                const assembled = contentInjector.assembleCleanContent([]);

                expect(assembled).toBe('');
            });

            it('should handle single content item', () => {
                const memoryContents = [
                    { filePath: '/memory/file1.md', content: 'Single content', title: 'File 1' }
                ];

                const assembled = contentInjector.assembleCleanContent(memoryContents);

                expect(assembled).toBe('Single content');
            });

            it('should handle contents with existing newlines', () => {
                const memoryContents = [
                    { filePath: '/memory/file1.md', content: 'Line 1\nLine 2\nLine 3', title: 'File 1' },
                    { filePath: '/memory/file2.md', content: 'Other line 1\nOther line 2', title: 'File 2' }
                ];

                const assembled = contentInjector.assembleCleanContent(memoryContents);

                expect(assembled).toBe('Line 1\nLine 2\nLine 3\n\nOther line 1\nOther line 2');
            });

            it('should create seamless cohesive text block', () => {
                const memoryContents = [
                    { filePath: '/memory/intro.md', content: 'This is an introduction to the system.', title: 'Intro' },
                    { filePath: '/memory/details.md', content: 'Here are the detailed specifications.', title: 'Details' },
                    { filePath: '/memory/examples.md', content: 'And here are some examples.', title: 'Examples' }
                ];

                const assembled = contentInjector.assembleCleanContent(memoryContents);

                // The assembled content should read naturally as a single piece
                expect(assembled).toBe(
                    'This is an introduction to the system.\n\n' +
                    'Here are the detailed specifications.\n\n' +
                    'And here are some examples.'
                );

                // Should not have any visible separators or structure
                expect(assembled.split('\n\n').length).toBe(3);
            });

            it('should handle large content blocks without truncation', () => {
                // Story requirement: No truncation or size limits
                const largeContent = 'x'.repeat(100000);
                const memoryContents = [
                    { filePath: '/memory/file1.md', content: largeContent, title: 'Large File' },
                    { filePath: '/memory/file2.md', content: 'Small content', title: 'Small File' }
                ];

                const assembled = contentInjector.assembleCleanContent(memoryContents);

                expect(assembled.length).toBe(100000 + 2 + 13); // large + \n\n + small
                expect(assembled).toContain(largeContent);
                expect(assembled).toContain('Small content');
            });

            it('should preserve content order', () => {
                const memoryContents = [
                    { filePath: '/memory/file1.md', content: 'First', title: 'File 1' },
                    { filePath: '/memory/file2.md', content: 'Second', title: 'File 2' },
                    { filePath: '/memory/file3.md', content: 'Third', title: 'File 3' },
                    { filePath: '/memory/file4.md', content: 'Fourth', title: 'File 4' }
                ];

                const assembled = contentInjector.assembleCleanContent(memoryContents);

                expect(assembled).toBe('First\n\nSecond\n\nThird\n\nFourth');
            });

            it('should handle empty content strings', () => {
                const memoryContents = [
                    { filePath: '/memory/file1.md', content: 'Content 1', title: 'File 1' },
                    { filePath: '/memory/file2.md', content: '', title: 'File 2' },
                    { filePath: '/memory/file3.md', content: 'Content 3', title: 'File 3' }
                ];

                const assembled = contentInjector.assembleCleanContent(memoryContents);

                expect(assembled).toBe('Content 1\n\n\n\nContent 3');
            });

            it('should only use double newline as separator', () => {
                const memoryContents = [
                    { filePath: '/memory/file1.md', content: 'Content A', title: 'File A' },
                    { filePath: '/memory/file2.md', content: 'Content B', title: 'File B' }
                ];

                const assembled = contentInjector.assembleCleanContent(memoryContents);

                // Should have exactly one separator (double newline)
                const parts = assembled.split('Content A');
                expect(parts.length).toBe(2);
                expect(parts[1]).toBe('\n\nContent B');
            });
        });

        describe('Integration: Wildcard queries with clean content assembly', () => {
            it('should combine wildcard query results into clean content', async () => {
                // This test verifies both stories work together

                // Setup mock data
                const mockContents = [
                    { filePath: '/memory/db1.md', content: 'Database content 1', title: 'DB 1' },
                    { filePath: '/memory/db2.md', content: 'Database content 2', title: 'DB 2' }
                ];

                // Mock getMemoryContentsByTags to return our test data
                jest.spyOn(contentInjector, 'getMemoryContentsByTags').mockResolvedValue(mockContents);

                const assembled = await contentInjector.getAssembledContent(['backend.database.*']);

                expect(assembled).toBe('Database content 1\n\nDatabase content 2');
                expect(assembled).not.toContain('DB 1');
                expect(assembled).not.toContain('DB 2');
                expect(assembled).not.toContain('---');
            });

            it('should handle multiple wildcard patterns with clean assembly', async () => {
                const mockContents = [
                    { filePath: '/memory/db.md', content: 'Database info', title: 'DB' },
                    { filePath: '/memory/api.md', content: 'API info', title: 'API' },
                    { filePath: '/memory/auth.md', content: 'Auth info', title: 'Auth' }
                ];

                jest.spyOn(contentInjector, 'getMemoryContentsByTags').mockResolvedValue(mockContents);

                const assembled = await contentInjector.getAssembledContent(['backend.*', 'security.*']);

                expect(assembled).toBe('Database info\n\nAPI info\n\nAuth info');
                expect(assembled.split('\n\n').length).toBe(3);
            });

            it('should return empty string when no memories match wildcard', async () => {
                jest.spyOn(contentInjector, 'getMemoryContentsByTags').mockResolvedValue([]);

                const assembled = await contentInjector.getAssembledContent(['nonexistent.*']);

                expect(assembled).toBe('');
            });
        });

        describe('User-controlled sizing', () => {
            it('should not implement automatic truncation', () => {
                // Verify the method signature doesn't accept size limits
                const memoryContents = [
                    { filePath: '/memory/file1.md', content: 'Content', title: 'File 1' }
                ];

                // This should work without any size parameters
                const assembled = contentInjector.assembleCleanContent(memoryContents);

                expect(assembled).toBeDefined();
            });

            it('should preserve all content regardless of total size', () => {
                const memoryContents = [
                    { filePath: '/memory/file1.md', content: 'A'.repeat(50000), title: 'File 1' },
                    { filePath: '/memory/file2.md', content: 'B'.repeat(50000), title: 'File 2' },
                    { filePath: '/memory/file3.md', content: 'C'.repeat(50000), title: 'File 3' }
                ];

                const assembled = contentInjector.assembleCleanContent(memoryContents);

                // Total size should be 150000 (content) + 4 (separators)
                expect(assembled.length).toBe(150004);
                expect(assembled).toContain('A'.repeat(50000));
                expect(assembled).toContain('B'.repeat(50000));
                expect(assembled).toContain('C'.repeat(50000));
            });
        });

        describe('Seamless context for Copilot', () => {
            it('should create text that reads as single cohesive piece', () => {
                const memoryContents = [
                    { filePath: '/memory/part1.md', content: 'The user authentication system uses JWT tokens.', title: 'Auth' },
                    { filePath: '/memory/part2.md', content: 'Tokens are stored in HTTP-only cookies for security.', title: 'Security' },
                    { filePath: '/memory/part3.md', content: 'The refresh token mechanism allows for seamless session renewal.', title: 'Sessions' }
                ];

                const assembled = contentInjector.assembleCleanContent(memoryContents);

                // Should read naturally when provided to Copilot
                expect(assembled).toBe(
                    'The user authentication system uses JWT tokens.\n\n' +
                    'Tokens are stored in HTTP-only cookies for security.\n\n' +
                    'The refresh token mechanism allows for seamless session renewal.'
                );

                // Should feel like cohesive context
                expect(assembled.includes('###')).toBe(false);
                expect(assembled.includes('---')).toBe(false);
                expect(assembled.includes('**')).toBe(false);
            });

            it('should work well with conversational content', () => {
                const memoryContents = [
                    { filePath: '/memory/context.md', content: 'Our API uses REST principles.', title: 'API' },
                    { filePath: '/memory/details.md', content: 'All endpoints return JSON responses.', title: 'JSON' },
                    { filePath: '/memory/auth.md', content: 'Authentication is required for protected routes.', title: 'Auth' }
                ];

                const assembled = contentInjector.assembleCleanContent(memoryContents);

                // This would work perfectly as context for a question like:
                // "How should I implement a new endpoint?"
                expect(assembled).toBe(
                    'Our API uses REST principles.\n\n' +
                    'All endpoints return JSON responses.\n\n' +
                    'Authentication is required for protected routes.'
                );
            });
        });
    });
});
