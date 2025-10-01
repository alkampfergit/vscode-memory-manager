import * as vscode from 'vscode';
import { ContentInjectionEngine } from '../../src/chat/ContentInjectionEngine';
import { MemoryIndex } from '../../src/core/MemoryIndex';
import { TagSystem } from '../../src/core/TagSystem';

// Mock vscode module
jest.mock('vscode', () => ({
    Uri: {
        file: jest.fn((path: string) => ({ fsPath: path, path }))
    },
    commands: {
        executeCommand: jest.fn()
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
});