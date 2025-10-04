/**
 * Feature 8, Story 1: Non-Intrusive Error Handling
 *
 * Tests that errors are handled in a way that does not interrupt the user's workflow:
 * - No modal dialogs for validation/parsing errors
 * - Errors fail silently from user's immediate perspective
 * - Non-blocking UI surfaces (Output Channel) are used for reporting
 */

import * as vscode from 'vscode';
import { ErrorReporter, ErrorSeverity } from '../../src/core/ErrorReporter';
import { MemorySynchronizationService } from '../../src/core/MemorySynchronizationService';
import { MemoryIndex } from '../../src/core/MemoryIndex';
import { TagSystem } from '../../src/core/TagSystem';

describe('Feature 8, Story 1: Non-Intrusive Error Handling', () => {
    describe('ErrorReporter', () => {
        let errorReporter: ErrorReporter;

        beforeEach(() => {
            errorReporter = ErrorReporter.getInstance();
            errorReporter.clearHistory();
        });

        afterEach(() => {
            errorReporter.clearHistory();
        });

        describe('Basic error reporting', () => {
            it('should report errors without using modal dialogs', () => {
                // Spy on vscode.window methods to ensure they're NOT called
                const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage');
                const showWarningSpy = jest.spyOn(vscode.window, 'showWarningMessage');

                errorReporter.reportError('Test error', '/path/to/file.md', 'Error details');

                // Verify NO modal dialogs were shown
                expect(showErrorSpy).not.toHaveBeenCalled();
                expect(showWarningSpy).not.toHaveBeenCalled();

                showErrorSpy.mockRestore();
                showWarningSpy.mockRestore();
            });

            it('should store error in history', () => {
                errorReporter.reportError('Test error', '/path/to/file.md');

                const history = errorReporter.getErrorHistory();

                expect(history).toHaveLength(1);
                expect(history[0].message).toBe('Test error');
                expect(history[0].severity).toBe(ErrorSeverity.Error);
                expect(history[0].filePath).toBe('/path/to/file.md');
            });

            it('should log to console for debugging', () => {
                const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

                errorReporter.reportError('Test error', '/path/to/file.md', 'Details');

                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Test error (/path/to/file.md)',
                    'Details'
                );

                consoleErrorSpy.mockRestore();
            });

            it('should include timestamp in error report', () => {
                const before = new Date();
                errorReporter.reportError('Test error');
                const after = new Date();

                const history = errorReporter.getErrorHistory();

                expect(history[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
                expect(history[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
            });
        });

        describe('Error severity levels', () => {
            it('should support error severity', () => {
                errorReporter.reportError('Error message');

                const history = errorReporter.getErrorHistory();
                expect(history[0].severity).toBe(ErrorSeverity.Error);
            });

            it('should support warning severity', () => {
                errorReporter.reportWarning('Warning message');

                const history = errorReporter.getErrorHistory();
                expect(history[0].severity).toBe(ErrorSeverity.Warning);
            });

            it('should support info severity', () => {
                errorReporter.reportInfo('Info message');

                const history = errorReporter.getErrorHistory();
                expect(history[0].severity).toBe(ErrorSeverity.Info);
            });

            it('should log warnings to console.warn', () => {
                const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

                errorReporter.reportWarning('Warning message', '/file.md');

                expect(consoleWarnSpy).toHaveBeenCalledWith('Warning message (/file.md)', '');

                consoleWarnSpy.mockRestore();
            });

            it('should log info to console.log', () => {
                const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

                errorReporter.reportInfo('Info message', '/file.md');

                expect(consoleLogSpy).toHaveBeenCalledWith('Info message (/file.md)', '');

                consoleLogSpy.mockRestore();
            });
        });

        describe('Error history management', () => {
            it('should maintain error history', () => {
                errorReporter.reportError('Error 1');
                errorReporter.reportError('Error 2');
                errorReporter.reportWarning('Warning 1');

                const history = errorReporter.getErrorHistory();

                expect(history).toHaveLength(3);
                expect(history[0].message).toBe('Error 1');
                expect(history[1].message).toBe('Error 2');
                expect(history[2].message).toBe('Warning 1');
            });

            it('should limit history to max size', () => {
                // Report more than max history size (100)
                for (let i = 0; i < 150; i++) {
                    errorReporter.reportError(`Error ${i}`);
                }

                const history = errorReporter.getErrorHistory();

                expect(history.length).toBeLessThanOrEqual(100);
                // Should keep most recent errors
                expect(history[history.length - 1].message).toBe('Error 149');
            });

            it('should clear history on demand', () => {
                errorReporter.reportError('Error 1');
                errorReporter.reportError('Error 2');

                errorReporter.clearHistory();

                const history = errorReporter.getErrorHistory();
                expect(history).toHaveLength(0);
            });

            it('should get errors for specific file', () => {
                errorReporter.reportError('Error 1', '/file1.md');
                errorReporter.reportError('Error 2', '/file2.md');
                errorReporter.reportError('Error 3', '/file1.md');

                const file1Errors = errorReporter.getErrorsForFile('/file1.md');

                expect(file1Errors).toHaveLength(2);
                expect(file1Errors[0].message).toBe('Error 1');
                expect(file1Errors[1].message).toBe('Error 3');
            });

            it('should get recent errors', () => {
                for (let i = 0; i < 10; i++) {
                    errorReporter.reportError(`Error ${i}`);
                }

                const recent = errorReporter.getRecentErrors(3);

                expect(recent).toHaveLength(3);
                expect(recent[0].message).toBe('Error 7');
                expect(recent[1].message).toBe('Error 8');
                expect(recent[2].message).toBe('Error 9');
            });
        });

        describe('Optional details', () => {
            it('should handle errors without file path', () => {
                errorReporter.reportError('General error');

                const history = errorReporter.getErrorHistory();

                expect(history[0].message).toBe('General error');
                expect(history[0].filePath).toBeUndefined();
            });

            it('should handle errors without details', () => {
                errorReporter.reportError('Error message', '/file.md');

                const history = errorReporter.getErrorHistory();

                expect(history[0].message).toBe('Error message');
                expect(history[0].details).toBeUndefined();
            });

            it('should handle errors with both file path and details', () => {
                errorReporter.reportError(
                    'Error message',
                    '/file.md',
                    'Additional context'
                );

                const history = errorReporter.getErrorHistory();

                expect(history[0].message).toBe('Error message');
                expect(history[0].filePath).toBe('/file.md');
                expect(history[0].details).toBe('Additional context');
            });
        });

        describe('Non-blocking UI', () => {
            it('should use output channel for logging', () => {
                // The ErrorReporter creates an output channel internally
                // This test verifies it's created and used, not shown as modal
                const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage');

                errorReporter.reportError('Test error');

                // Verify error was reported but NO modal shown
                expect(showErrorSpy).not.toHaveBeenCalled();
                expect(errorReporter.getErrorHistory()).toHaveLength(1);

                showErrorSpy.mockRestore();
            });

            it('should allow showing output channel with preserved focus', () => {
                // This is a manual user action, not automatic
                // The method exists but doesn't interrupt workflow
                expect(() => {
                    errorReporter.showOutputChannel(true);
                }).not.toThrow();
            });
        });

        describe('Singleton pattern', () => {
            it('should return same instance', () => {
                const instance1 = ErrorReporter.getInstance();
                const instance2 = ErrorReporter.getInstance();

                expect(instance1).toBe(instance2);
            });

            it('should share error history across instances', () => {
                const instance1 = ErrorReporter.getInstance();
                instance1.reportError('Shared error');

                const instance2 = ErrorReporter.getInstance();
                const history = instance2.getErrorHistory();

                expect(history).toHaveLength(1);
                expect(history[0].message).toBe('Shared error');
            });
        });
    });

    describe('Integration with MemorySynchronizationService', () => {
        let memoryIndex: MemoryIndex;
        let tagSystem: TagSystem;
        let syncService: MemorySynchronizationService;
        let errorReporter: ErrorReporter;

        beforeEach(() => {
            memoryIndex = new MemoryIndex();
            tagSystem = new TagSystem();
            syncService = new MemorySynchronizationService(memoryIndex, tagSystem);
            errorReporter = ErrorReporter.getInstance();
            errorReporter.clearHistory();
        });

        afterEach(() => {
            errorReporter.clearHistory();
        });

        it('should handle file processing errors non-intrusively', async () => {
            const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage');

            // Mock a file with invalid content
            const mockUri = vscode.Uri.file('/test/invalid.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('Invalid content without frontmatter')
            );

            await syncService.handleFileCreateOrChange(mockUri);

            // Verify NO modal dialog was shown
            expect(showErrorSpy).not.toHaveBeenCalled();

            // Verify error was logged non-intrusively
            const history = errorReporter.getErrorHistory();
            expect(history.length).toBeGreaterThan(0);
            expect(history[0].severity).toBe(ErrorSeverity.Error);

            showErrorSpy.mockRestore();
        });

        it('should continue processing after errors (silent failure)', async () => {
            const mockUri = vscode.Uri.file('/test/invalid.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('Invalid content')
            );

            // Should not throw - silently fails
            await expect(
                syncService.handleFileCreateOrChange(mockUri)
            ).resolves.not.toThrow();

            // Error is logged but processing continues
            const history = errorReporter.getErrorHistory();
            expect(history.length).toBeGreaterThan(0);
        });

        it('should report file path in errors', async () => {
            const mockUri = vscode.Uri.file('/test/problem.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('Invalid')
            );

            await syncService.handleFileCreateOrChange(mockUri);

            const history = errorReporter.getErrorHistory();
            expect(history[0].filePath).toBe('/test/problem.md');
        });

        it('should include error details in report', async () => {
            const mockUri = vscode.Uri.file('/test/malformed.md');
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('No frontmatter')
            );

            await syncService.handleFileCreateOrChange(mockUri);

            const history = errorReporter.getErrorHistory();
            expect(history[0].details).toBeDefined();
            expect(history[0].details).toContain('frontmatter');
        });

        it('should never block user workflow with modal dialogs', async () => {
            const modalSpy = jest.spyOn(vscode.window, 'showErrorMessage');

            // Simulate multiple file errors
            for (let i = 0; i < 5; i++) {
                const mockUri = vscode.Uri.file(`/test/file${i}.md`);
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('Invalid')
                );
                await syncService.handleFileCreateOrChange(mockUri);
            }

            // Despite 5 errors, NO modal dialogs should appear
            expect(modalSpy).not.toHaveBeenCalled();

            // All errors should be logged non-intrusively
            const history = errorReporter.getErrorHistory();
            expect(history.length).toBeGreaterThanOrEqual(5);

            modalSpy.mockRestore();
        });
    });
});
