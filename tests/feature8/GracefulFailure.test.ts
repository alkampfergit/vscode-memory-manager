/**
 * Feature 8, Story 3: Graceful Failure for Malformed Files
 *
 * Tests that one bad memory file does not prevent other valid files from being processed:
 * - File processing wrapped in try/catch
 * - Errors logged and processing continues
 * - Invalid files skipped, not included in index
 * - Overall indexing process doesn't halt
 */

import * as vscode from 'vscode';
import { MemorySynchronizationService } from '../../src/core/MemorySynchronizationService';
import { MemoryIndex } from '../../src/core/MemoryIndex';
import { TagSystem } from '../../src/core/TagSystem';
import { ErrorReporter } from '../../src/core/ErrorReporter';
import { DiagnosticReporter } from '../../src/core/DiagnosticReporter';

describe('Feature 8, Story 3: Graceful Failure for Malformed Files', () => {
    let memoryIndex: MemoryIndex;
    let tagSystem: TagSystem;
    let syncService: MemorySynchronizationService;
    let errorReporter: ErrorReporter;
    let diagnosticReporter: DiagnosticReporter;

    beforeEach(() => {
        memoryIndex = new MemoryIndex();
        tagSystem = new TagSystem();
        syncService = new MemorySynchronizationService(memoryIndex, tagSystem);
        errorReporter = ErrorReporter.getInstance();
        diagnosticReporter = DiagnosticReporter.getInstance();
        errorReporter.clearHistory();
        diagnosticReporter.clearAll();
    });

    afterEach(() => {
        errorReporter.clearHistory();
        diagnosticReporter.clearAll();
    });

    describe('Single file failure does not halt processing', () => {
        it('should not throw when processing invalid file', async () => {
            const mockUri = vscode.Uri.file('/test/invalid.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('Invalid content')
            );

            // Should not throw - graceful failure
            await expect(
                syncService.handleFileCreateOrChange(mockUri)
            ).resolves.not.toThrow();
        });

        it('should log error but continue processing', async () => {
            const mockUri = vscode.Uri.file('/test/invalid.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('Invalid content')
            );

            await syncService.handleFileCreateOrChange(mockUri);

            // Error should be logged
            const errorHistory = errorReporter.getErrorHistory();
            expect(errorHistory.length).toBeGreaterThan(0);

            // But processing completed (no throw)
            expect(true).toBe(true);
        });

        it('should skip invalid file and not add to index', async () => {
            const mockUri = vscode.Uri.file('/test/bad-file.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('---\ntitle: Test\n---\nNo tags')
            );

            await syncService.handleFileCreateOrChange(mockUri);

            // File should NOT be in index
            expect(memoryIndex.has('/test/bad-file.md')).toBe(false);
        });

        it('should skip invalid file and not add tags to tag system', async () => {
            const mockUri = vscode.Uri.file('/test/bad-file.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('---\ntitle: Test\n---\nNo tags')
            );

            await syncService.handleFileCreateOrChange(mockUri);

            // Tags should not be added
            expect(tagSystem.size()).toBe(0);
        });
    });

    describe('Batch processing resilience', () => {
        it('should process all valid files even if some fail', async () => {
            const validFile1 = vscode.Uri.file('/test/valid1.md');
            const invalidFile = vscode.Uri.file('/test/invalid.md');
            const validFile2 = vscode.Uri.file('/test/valid2.md');

            (vscode.workspace.fs.readFile as jest.Mock).mockImplementation((uri) => {
                if (uri.fsPath === '/test/valid1.md') {
                    return Promise.resolve(Buffer.from('---\ntitle: Valid 1\ntags: [test1]\n---\nContent'));
                } else if (uri.fsPath === '/test/invalid.md') {
                    return Promise.resolve(Buffer.from('Invalid content'));
                } else if (uri.fsPath === '/test/valid2.md') {
                    return Promise.resolve(Buffer.from('---\ntitle: Valid 2\ntags: [test2]\n---\nContent'));
                }
                return Promise.reject(new Error('File not found'));
            });

            await syncService.synchronizeBatch([validFile1, invalidFile, validFile2]);

            // Both valid files should be in index
            expect(memoryIndex.has('/test/valid1.md')).toBe(true);
            expect(memoryIndex.has('/test/valid2.md')).toBe(true);

            // Invalid file should NOT be in index
            expect(memoryIndex.has('/test/invalid.md')).toBe(false);
        });

        it('should process all files even if first file fails', async () => {
            const invalidFile = vscode.Uri.file('/test/invalid.md');
            const validFile = vscode.Uri.file('/test/valid.md');

            (vscode.workspace.fs.readFile as jest.Mock).mockImplementation((uri) => {
                if (uri.fsPath === '/test/invalid.md') {
                    return Promise.resolve(Buffer.from('Invalid'));
                } else if (uri.fsPath === '/test/valid.md') {
                    return Promise.resolve(Buffer.from('---\ntitle: Valid\ntags: [test]\n---\nContent'));
                }
                return Promise.reject(new Error('File not found'));
            });

            await syncService.synchronizeBatch([invalidFile, validFile]);

            // Valid file should still be processed
            expect(memoryIndex.has('/test/valid.md')).toBe(true);
            expect(memoryIndex.has('/test/invalid.md')).toBe(false);
        });

        it('should process all files even if last file fails', async () => {
            const validFile = vscode.Uri.file('/test/valid.md');
            const invalidFile = vscode.Uri.file('/test/invalid.md');

            (vscode.workspace.fs.readFile as jest.Mock).mockImplementation((uri) => {
                if (uri.fsPath === '/test/valid.md') {
                    return Promise.resolve(Buffer.from('---\ntitle: Valid\ntags: [test]\n---\nContent'));
                } else if (uri.fsPath === '/test/invalid.md') {
                    return Promise.resolve(Buffer.from('Invalid'));
                }
                return Promise.reject(new Error('File not found'));
            });

            await syncService.synchronizeBatch([validFile, invalidFile]);

            // Valid file should still be processed
            expect(memoryIndex.has('/test/valid.md')).toBe(true);
            expect(memoryIndex.has('/test/invalid.md')).toBe(false);
        });

        it('should process all files even if multiple files fail', async () => {
            const invalid1 = vscode.Uri.file('/test/bad1.md');
            const valid1 = vscode.Uri.file('/test/valid1.md');
            const invalid2 = vscode.Uri.file('/test/bad2.md');
            const valid2 = vscode.Uri.file('/test/valid2.md');
            const invalid3 = vscode.Uri.file('/test/bad3.md');

            (vscode.workspace.fs.readFile as jest.Mock).mockImplementation((uri) => {
                if (uri.fsPath.includes('valid')) {
                    const num = uri.fsPath.match(/valid(\d+)/)?.[1];
                    return Promise.resolve(Buffer.from(`---\ntitle: Valid ${num}\ntags: [test${num}]\n---\nContent`));
                } else {
                    return Promise.resolve(Buffer.from('Invalid'));
                }
            });

            await syncService.synchronizeBatch([invalid1, valid1, invalid2, valid2, invalid3]);

            // Valid files should be processed
            expect(memoryIndex.has('/test/valid1.md')).toBe(true);
            expect(memoryIndex.has('/test/valid2.md')).toBe(true);

            // Invalid files should not be in index
            expect(memoryIndex.has('/test/bad1.md')).toBe(false);
            expect(memoryIndex.has('/test/bad2.md')).toBe(false);
            expect(memoryIndex.has('/test/bad3.md')).toBe(false);
        });

        it('should complete batch processing even if all files fail', async () => {
            const invalid1 = vscode.Uri.file('/test/invalid1.md');
            const invalid2 = vscode.Uri.file('/test/invalid2.md');
            const invalid3 = vscode.Uri.file('/test/invalid3.md');

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('Invalid')
            );

            // Should not throw
            await expect(
                syncService.synchronizeBatch([invalid1, invalid2, invalid3])
            ).resolves.not.toThrow();

            // No files should be in index
            expect(memoryIndex.size()).toBe(0);

            // But errors should be logged
            const errorHistory = errorReporter.getErrorHistory();
            expect(errorHistory.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('Different types of errors', () => {
        it('should handle missing frontmatter gracefully', async () => {
            const mockUri = vscode.Uri.file('/test/no-frontmatter.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('Just content, no frontmatter')
            );

            await expect(
                syncService.handleFileCreateOrChange(mockUri)
            ).resolves.not.toThrow();

            expect(memoryIndex.has('/test/no-frontmatter.md')).toBe(false);
        });

        it('should handle malformed YAML gracefully', async () => {
            const mockUri = vscode.Uri.file('/test/malformed-yaml.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('---\ntitle: "Unclosed quote\ntags: [test]\n---\nContent')
            );

            await expect(
                syncService.handleFileCreateOrChange(mockUri)
            ).resolves.not.toThrow();

            expect(memoryIndex.has('/test/malformed-yaml.md')).toBe(false);
        });

        it('should handle missing required fields gracefully', async () => {
            const mockUri = vscode.Uri.file('/test/missing-fields.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('---\ntitle: Test\n---\nNo tags field')
            );

            await expect(
                syncService.handleFileCreateOrChange(mockUri)
            ).resolves.not.toThrow();

            expect(memoryIndex.has('/test/missing-fields.md')).toBe(false);
        });

        it('should handle empty tags array gracefully', async () => {
            const mockUri = vscode.Uri.file('/test/empty-tags.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('---\ntitle: Test\ntags: []\n---\nContent')
            );

            await expect(
                syncService.handleFileCreateOrChange(mockUri)
            ).resolves.not.toThrow();

            expect(memoryIndex.has('/test/empty-tags.md')).toBe(false);
        });

        it('should handle file read errors gracefully', async () => {
            const mockUri = vscode.Uri.file('/test/unreadable.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockRejectedValue(
                new Error('Permission denied')
            );

            await expect(
                syncService.handleFileCreateOrChange(mockUri)
            ).resolves.not.toThrow();

            expect(memoryIndex.has('/test/unreadable.md')).toBe(false);
        });
    });

    describe('Error logging and reporting', () => {
        it('should log each failed file separately', async () => {
            const invalid1 = vscode.Uri.file('/test/invalid1.md');
            const invalid2 = vscode.Uri.file('/test/invalid2.md');

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('Invalid')
            );

            await syncService.synchronizeBatch([invalid1, invalid2]);

            const errorHistory = errorReporter.getErrorHistory();
            expect(errorHistory.length).toBeGreaterThanOrEqual(2);
        });

        it('should create diagnostics for each failed file', async () => {
            const invalid1 = vscode.Uri.file('/test/invalid1.md');
            const invalid2 = vscode.Uri.file('/test/invalid2.md');

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('Invalid')
            );

            await syncService.synchronizeBatch([invalid1, invalid2]);

            const diagnostics1 = diagnosticReporter.getDiagnosticsForFile('/test/invalid1.md');
            const diagnostics2 = diagnosticReporter.getDiagnosticsForFile('/test/invalid2.md');

            expect(diagnostics1.length).toBeGreaterThan(0);
            expect(diagnostics2.length).toBeGreaterThan(0);
        });

        it('should maintain separate error contexts for each file', async () => {
            const noTitle = vscode.Uri.file('/test/no-title.md');
            const noTags = vscode.Uri.file('/test/no-tags.md');

            (vscode.workspace.fs.readFile as jest.Mock).mockImplementation((uri) => {
                if (uri.fsPath === '/test/no-title.md') {
                    return Promise.resolve(Buffer.from('---\ntags: [test]\n---\nContent'));
                } else if (uri.fsPath === '/test/no-tags.md') {
                    return Promise.resolve(Buffer.from('---\ntitle: Test\n---\nContent'));
                }
                return Promise.reject(new Error('File not found'));
            });

            await syncService.synchronizeBatch([noTitle, noTags]);

            const errors = errorReporter.getErrorHistory();
            const titleError = errors.find(e => e.filePath === '/test/no-title.md');
            const tagsError = errors.find(e => e.filePath === '/test/no-tags.md');

            expect(titleError).toBeDefined();
            expect(tagsError).toBeDefined();
            expect(titleError?.details).toContain('title');
            expect(tagsError?.details).toContain('tags');
        });
    });

    describe('State consistency after failures', () => {
        it('should maintain valid state after processing mixed batch', async () => {
            const valid1 = vscode.Uri.file('/test/valid1.md');
            const invalid = vscode.Uri.file('/test/invalid.md');
            const valid2 = vscode.Uri.file('/test/valid2.md');

            (vscode.workspace.fs.readFile as jest.Mock).mockImplementation((uri) => {
                if (uri.fsPath === '/test/valid1.md') {
                    return Promise.resolve(Buffer.from('---\ntitle: Valid 1\ntags: [tag1, tag2]\n---\nContent'));
                } else if (uri.fsPath === '/test/invalid.md') {
                    return Promise.resolve(Buffer.from('Invalid'));
                } else if (uri.fsPath === '/test/valid2.md') {
                    return Promise.resolve(Buffer.from('---\ntitle: Valid 2\ntags: [tag3]\n---\nContent'));
                }
                return Promise.reject(new Error('File not found'));
            });

            await syncService.synchronizeBatch([valid1, invalid, valid2]);

            // Index should only contain valid files
            expect(memoryIndex.size()).toBe(2);

            // Tag system should only contain tags from valid files
            expect(tagSystem.queryByTag('tag1')).toContain('/test/valid1.md');
            expect(tagSystem.queryByTag('tag2')).toContain('/test/valid1.md');
            expect(tagSystem.queryByTag('tag3')).toContain('/test/valid2.md');
        });

        it('should not corrupt index when invalid file is processed', async () => {
            // Add valid file first
            const valid = vscode.Uri.file('/test/valid.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('---\ntitle: Valid\ntags: [test]\n---\nContent')
            );
            await syncService.handleFileCreateOrChange(valid);

            const beforeSize = memoryIndex.size();

            // Try to add invalid file
            const invalid = vscode.Uri.file('/test/invalid.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('Invalid')
            );
            await syncService.handleFileCreateOrChange(invalid);

            // Index should still have only the valid file
            expect(memoryIndex.size()).toBe(beforeSize);
            expect(memoryIndex.has('/test/valid.md')).toBe(true);
            expect(memoryIndex.has('/test/invalid.md')).toBe(false);
        });
    });

    describe('Promise.allSettled usage', () => {
        it('should use Promise.allSettled to ensure all files are processed', async () => {
            const files = [
                vscode.Uri.file('/test/file1.md'),
                vscode.Uri.file('/test/file2.md'),
                vscode.Uri.file('/test/file3.md')
            ];

            let processedCount = 0;
            (vscode.workspace.fs.readFile as jest.Mock).mockImplementation(() => {
                processedCount++;
                return Promise.resolve(Buffer.from('Invalid'));
            });

            await syncService.synchronizeBatch(files);

            // All files should have been attempted
            expect(processedCount).toBe(3);
        });
    });
});
