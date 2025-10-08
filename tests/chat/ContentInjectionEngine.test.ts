import * as vscode from 'vscode';
import { ContentInjectionEngine } from '../../src/chat/ContentInjectionEngine';
import { MemoryIndex } from '../../src/core/MemoryIndex';
import { TagSystem } from '../../src/core/TagSystem';
import * as fs from 'fs';
import * as path from 'path';

// Mock vscode module
jest.mock('vscode', () => ({
    Uri: {
        file: jest.fn((path: string) => ({ fsPath: path, path }))
    },
    commands: {
        executeCommand: jest.fn()
    },
    window: {
        createOutputChannel: jest.fn((name: string) => ({
            name,
            append: jest.fn(),
            appendLine: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn()
        }))
    }
}));

// Mock fs module
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        access: jest.fn()
    },
    constants: {
        R_OK: 4
    }
}));

describe('ContentInjectionEngine', () => {
    let contentInjectionEngine: ContentInjectionEngine;
    let mockMemoryIndex: jest.Mocked<MemoryIndex>;
    let mockTagSystem: jest.Mocked<TagSystem>;

    beforeEach(() => {
        mockMemoryIndex = {
            get: jest.fn(),
            set: jest.fn(),
            has: jest.fn(),
            delete: jest.fn(),
            size: jest.fn(),
            clear: jest.fn(),
            getAllFilePaths: jest.fn()
        } as any;

        mockTagSystem = {
            addTags: jest.fn(),
            removeTags: jest.fn(),
            queryByTag: jest.fn(),
            queryByWildcard: jest.fn(),
            getAllTags: jest.fn(),
            getTagsForFile: jest.fn(),
            clear: jest.fn(),
            size: jest.fn()
        } as any;

        contentInjectionEngine = new ContentInjectionEngine(mockMemoryIndex, mockTagSystem);

        // Clear mocks
        jest.clearAllMocks();
    });

    describe('attachFilesByTags', () => {
        it('should attach files for multiple tags', async () => {
            mockTagSystem.queryByTag
                .mockReturnValueOnce(['/memory/database.md'])
                .mockReturnValueOnce(['/memory/auth.md']);

            const result = await contentInjectionEngine.attachFilesByTags(['backend.database', 'api.auth']);

            expect(result).toEqual(['/memory/database.md', '/memory/auth.md']);
            expect(mockTagSystem.queryByTag).toHaveBeenCalledWith('backend.database');
            expect(mockTagSystem.queryByTag).toHaveBeenCalledWith('api.auth');
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'github.copilot.chat.attachFile',
                expect.objectContaining({ fsPath: '/memory/database.md' }),
                expect.objectContaining({ fsPath: '/memory/auth.md' })
            );
        });

        it('should handle wildcard patterns in multiple tags', async () => {
            mockTagSystem.queryByWildcard
                .mockReturnValueOnce(['/memory/backend-db.md']);

            mockTagSystem.queryByTag
                .mockReturnValueOnce([]);

            const result = await contentInjectionEngine.attachFilesByTags(['backend.*', 'frontend.ui']);

            expect(result).toEqual(['/memory/backend-db.md']);
            expect(mockTagSystem.queryByWildcard).toHaveBeenCalledWith('backend.*');
            expect(mockTagSystem.queryByTag).toHaveBeenCalledWith('frontend.ui');
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'github.copilot.chat.attachFile',
                expect.objectContaining({ fsPath: '/memory/backend-db.md' })
            );
        });

        it('should handle duplicate files from multiple tags', async () => {
            mockTagSystem.queryByTag
                .mockReturnValueOnce(['/memory/fullstack.md'])
                .mockReturnValueOnce(['/memory/fullstack.md']); // Same file for both tags

            const result = await contentInjectionEngine.attachFilesByTags(['backend.database', 'api.auth']);

            expect(result).toEqual(['/memory/fullstack.md']); // Should only include file once
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'github.copilot.chat.attachFile',
                expect.objectContaining({ fsPath: '/memory/fullstack.md' })
            );
            expect(vscode.commands.executeCommand).toHaveBeenCalledTimes(1);
        });

        it('should return empty array when no tags specified', async () => {
            const result = await contentInjectionEngine.attachFilesByTags([]);

            expect(result).toEqual([]);
            expect(mockTagSystem.queryByTag).not.toHaveBeenCalled();
            expect(mockTagSystem.queryByWildcard).not.toHaveBeenCalled();
            expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
        });

        it('should return empty array when no memories found', async () => {
            mockTagSystem.queryByTag
                .mockReturnValueOnce([])
                .mockReturnValueOnce([]);

            const result = await contentInjectionEngine.attachFilesByTags(['nonexistent.tag', 'another.missing']);

            expect(result).toEqual([]);
            expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
        });

        it('should handle mix of existing and non-existing tags', async () => {
            mockTagSystem.queryByTag
                .mockReturnValueOnce(['/memory/existing.md'])
                .mockReturnValueOnce([]);

            const result = await contentInjectionEngine.attachFilesByTags(['existing.tag', 'nonexistent.tag']);

            expect(result).toEqual(['/memory/existing.md']);
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'github.copilot.chat.attachFile',
                expect.objectContaining({ fsPath: '/memory/existing.md' })
            );
        });
    });

    describe('getMatchSummaryForTags', () => {
        it('should return summary for multiple tags', () => {
            mockTagSystem.queryByTag
                .mockReturnValueOnce(['/memory/db.md', '/memory/schema.md'])
                .mockReturnValueOnce(['/memory/auth.md']);

            const result = contentInjectionEngine.getMatchSummaryForTags(['backend.database', 'api.auth']);

            expect(result).toEqual({
                count: 3,
                filePaths: ['/memory/db.md', '/memory/schema.md', '/memory/auth.md'],
                tagPatterns: ['backend.database', 'api.auth']
            });
        });

        it('should handle duplicate files in summary', () => {
            mockTagSystem.queryByTag
                .mockReturnValueOnce(['/memory/shared.md', '/memory/db.md'])
                .mockReturnValueOnce(['/memory/shared.md', '/memory/auth.md']);

            const result = contentInjectionEngine.getMatchSummaryForTags(['backend.database', 'api.auth']);

            expect(result).toEqual({
                count: 3,
                filePaths: ['/memory/shared.md', '/memory/db.md', '/memory/auth.md'],
                tagPatterns: ['backend.database', 'api.auth']
            });
        });

        it('should handle wildcard patterns in summary', () => {
            mockTagSystem.queryByWildcard
                .mockReturnValueOnce(['/memory/backend1.md', '/memory/backend2.md']);
            mockTagSystem.queryByTag
                .mockReturnValueOnce(['/memory/auth.md']);

            const result = contentInjectionEngine.getMatchSummaryForTags(['backend.*', 'api.auth']);

            expect(result).toEqual({
                count: 3,
                filePaths: ['/memory/backend1.md', '/memory/backend2.md', '/memory/auth.md'],
                tagPatterns: ['backend.*', 'api.auth']
            });
        });

        it('should return empty summary when no tags match', () => {
            mockTagSystem.queryByTag
                .mockReturnValueOnce([])
                .mockReturnValueOnce([]);

            const result = contentInjectionEngine.getMatchSummaryForTags(['nonexistent1', 'nonexistent2']);

            expect(result).toEqual({
                count: 0,
                filePaths: [],
                tagPatterns: ['nonexistent1', 'nonexistent2']
            });
        });
    });

    describe('attachFilesByTag (single tag)', () => {
        it('should attach files for a single tag', async () => {
            mockTagSystem.queryByTag.mockReturnValueOnce(['/memory/test.md']);

            const result = await contentInjectionEngine.attachFilesByTag('test.tag');

            expect(result).toEqual(['/memory/test.md']);
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'github.copilot.chat.attachFile',
                expect.objectContaining({ fsPath: '/memory/test.md' })
            );
        });

        it('should handle wildcard patterns', async () => {
            mockTagSystem.queryByWildcard.mockReturnValueOnce(['/memory/test1.md', '/memory/test2.md']);

            const result = await contentInjectionEngine.attachFilesByTag('test.*');

            expect(result).toEqual(['/memory/test1.md', '/memory/test2.md']);
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'github.copilot.chat.attachFile',
                expect.objectContaining({ fsPath: '/memory/test1.md' }),
                expect.objectContaining({ fsPath: '/memory/test2.md' })
            );
        });

        it('should return empty array when no files found', async () => {
            mockTagSystem.queryByTag.mockReturnValueOnce([]);

            const result = await contentInjectionEngine.attachFilesByTag('nonexistent.tag');

            expect(result).toEqual([]);
            expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
        });
    });

    describe('getMatchSummary', () => {
        it('should return summary for single tag', () => {
            mockTagSystem.queryByTag.mockReturnValueOnce(['/memory/test1.md', '/memory/test2.md']);

            const result = contentInjectionEngine.getMatchSummary('test.tag');

            expect(result).toEqual({
                count: 2,
                filePaths: ['/memory/test1.md', '/memory/test2.md']
            });
        });
    });

    describe('attachFilesByTag with references', () => {
        const mockReadFile = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>;
        const mockAccess = fs.promises.access as jest.MockedFunction<typeof fs.promises.access>;

        beforeEach(() => {
            mockReadFile.mockClear();
            mockAccess.mockClear();
        });

        it('should attach memory file and its referenced files', async () => {
            mockTagSystem.queryByTag.mockReturnValueOnce(['/memory/database.md']);

            // Mock the memory file content with a reference to another file
            mockReadFile.mockResolvedValueOnce(`---
title: Database Guide
tags: [backend.database]
---

This is the database guide.

See also [helper functions](./helper.ts) for utilities.`);

            // Mock access check for the referenced file
            mockAccess.mockResolvedValueOnce(undefined);

            const result = await contentInjectionEngine.attachFilesByTag('backend.database');

            expect(result).toContain('/memory/database.md');
            expect(result).toContain(path.resolve('/memory', 'helper.ts'));
            expect(result.length).toBe(2);
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'github.copilot.chat.attachFile',
                expect.objectContaining({ fsPath: '/memory/database.md' }),
                expect.objectContaining({ fsPath: path.resolve('/memory', 'helper.ts') })
            );
        });

        it('should attach memory file without referenced files when none exist', async () => {
            mockTagSystem.queryByTag.mockReturnValueOnce(['/memory/simple.md']);

            // Mock the memory file content without any references
            mockReadFile.mockResolvedValueOnce(`---
title: Simple Guide
tags: [simple]
---

This is a simple guide with no references.`);

            const result = await contentInjectionEngine.attachFilesByTag('simple');

            expect(result).toEqual(['/memory/simple.md']);
            expect(result.length).toBe(1);
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'github.copilot.chat.attachFile',
                expect.objectContaining({ fsPath: '/memory/simple.md' })
            );
        });

        it('should handle multiple memory files with different references', async () => {
            mockTagSystem.queryByTag.mockReturnValueOnce(['/memory/file1.md', '/memory/file2.md']);

            // Mock first memory file with reference
            mockReadFile.mockResolvedValueOnce(`---
title: File 1
tags: [test]
---

Content with [reference](./ref1.ts).`);

            // Mock content for ref1.ts
            mockReadFile.mockResolvedValueOnce(`console.log('ref1 content');`);

            // Mock second memory file with reference to a different file
            mockReadFile.mockResolvedValueOnce(`---
title: File 2
tags: [test]
---

Content with [reference](./ref2.ts).`);

            // Mock content for ref2.ts
            mockReadFile.mockResolvedValueOnce(`console.log('ref2 content');`);

            // Mock access checks for referenced files
            mockAccess.mockResolvedValueOnce(undefined);
            mockAccess.mockResolvedValueOnce(undefined);

            const result = await contentInjectionEngine.attachFilesByTag('test');

            expect(result).toContain('/memory/file1.md');
            expect(result).toContain('/memory/file2.md');
            expect(result).toContain(path.resolve('/memory', 'ref1.ts'));
            expect(result).toContain(path.resolve('/memory', 'ref2.ts'));
            expect(result.length).toBe(4);
        });

        it('should skip referenced files that cannot be accessed', async () => {
            mockTagSystem.queryByTag.mockReturnValueOnce(['/memory/database.md']);

            // Mock the memory file content with a reference to a non-existent file
            mockReadFile.mockResolvedValueOnce(`---
title: Database Guide
tags: [backend.database]
---

See [missing file](./missing.ts).`);

            // Mock access check to fail
            mockAccess.mockRejectedValueOnce(new Error('File not found'));

            const result = await contentInjectionEngine.attachFilesByTag('backend.database');

            // Should only include the original memory file, not the missing reference
            expect(result).toEqual(['/memory/database.md']);
            expect(result.length).toBe(1);
        });

        it('should deduplicate referenced files across multiple memory files', async () => {
            mockTagSystem.queryByTag.mockReturnValueOnce(['/memory/file1.md', '/memory/file2.md']);

            // Both memory files reference the same file
            mockReadFile.mockResolvedValueOnce(`---
title: File 1
tags: [test]
---

Content with [shared reference](./shared.ts).`);

            mockReadFile.mockResolvedValueOnce(`---
title: File 2
tags: [test]
---

Content with [shared reference](./shared.ts).`);

            // Mock access check for shared file (only once since it's the same file)
            mockAccess.mockResolvedValue(undefined);

            const result = await contentInjectionEngine.attachFilesByTag('test');

            // Should contain both memory files and the shared reference only once
            expect(result).toContain('/memory/file1.md');
            expect(result).toContain('/memory/file2.md');
            expect(result).toContain(path.resolve('/memory', 'shared.ts'));
            expect(result.length).toBe(3);
        });

        it('should not follow references recursively', async () => {
            mockTagSystem.queryByTag.mockReturnValueOnce(['/memory/main.md']);

            // Mock main memory file with reference to another file
            mockReadFile.mockResolvedValueOnce(`---
title: Main
tags: [test]
---

See [helper](./helper.md).`);

            // Mock the content of the referenced helper.md file
            mockReadFile.mockResolvedValueOnce(`---
title: Helper
tags: [helper]
---

Helper content.`);

            // Mock access check for helper file
            mockAccess.mockResolvedValueOnce(undefined);

            const result = await contentInjectionEngine.attachFilesByTag('test');

            // Should include main.md and helper.md, but not follow links in helper.md
            expect(result).toContain('/memory/main.md');
            expect(result).toContain(path.resolve('/memory', 'helper.md'));
            expect(result.length).toBe(2);

            // readFile should be called twice: once for main.md, once for helper.md (but not recursively)
            expect(mockReadFile).toHaveBeenCalledTimes(2);
        });

        it('should skip URL references', async () => {
            mockTagSystem.queryByTag.mockReturnValueOnce(['/memory/guide.md']);

            // Mock the memory file content with URL references
            mockReadFile.mockResolvedValueOnce(`---
title: Guide
tags: [test]
---

See [external docs](https://example.com/docs) and [local file](./local.ts).`);

            // Mock access check for local file only
            mockAccess.mockResolvedValueOnce(undefined);

            const result = await contentInjectionEngine.attachFilesByTag('test');

            // Should include the memory file and local reference, but not the URL
            expect(result).toContain('/memory/guide.md');
            expect(result).toContain(path.resolve('/memory', 'local.ts'));
            expect(result.length).toBe(2);
        });
    });

    describe('attachFilesByTags with references', () => {
        const mockReadFile = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>;
        const mockAccess = fs.promises.access as jest.MockedFunction<typeof fs.promises.access>;

        beforeEach(() => {
            mockReadFile.mockClear();
            mockAccess.mockClear();
        });

        it('should attach memory files and their references for multiple tags', async () => {
            mockTagSystem.queryByTag
                .mockReturnValueOnce(['/memory/db.md'])
                .mockReturnValueOnce(['/memory/auth.md']);

            // Mock first memory file with reference
            mockReadFile.mockResolvedValueOnce(`---
title: Database
tags: [backend.database]
---

See [schema](./schema.sql).`);

            // Mock content for schema.sql
            mockReadFile.mockResolvedValueOnce(`CREATE TABLE users (...);`);

            // Mock second memory file with reference
            mockReadFile.mockResolvedValueOnce(`---
title: Auth
tags: [backend.auth]
---

See [tokens](./tokens.ts).`);

            // Mock content for tokens.ts
            mockReadFile.mockResolvedValueOnce(`export const TOKEN_SECRET = 'secret';`);

            // Mock access checks
            mockAccess.mockResolvedValue(undefined);

            const result = await contentInjectionEngine.attachFilesByTags(['backend.database', 'backend.auth']);

            expect(result).toContain('/memory/db.md');
            expect(result).toContain('/memory/auth.md');
            expect(result).toContain(path.resolve('/memory', 'schema.sql'));
            expect(result).toContain(path.resolve('/memory', 'tokens.ts'));
            expect(result.length).toBe(4);
        });
    });
});