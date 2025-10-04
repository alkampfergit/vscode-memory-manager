/**
 * Feature 8, Story 4: Error Reporting Mechanisms
 *
 * Tests comprehensive error reporting through VS Code UI components:
 * - Output Channel for detailed logs
 * - Status Bar for high-level status
 * - Problems Panel for file-specific errors
 */

import * as vscode from 'vscode';
import { StatusBarManager } from '../../src/core/StatusBarManager';
import { ErrorReporter } from '../../src/core/ErrorReporter';
import { DiagnosticReporter } from '../../src/core/DiagnosticReporter';
import { MemoryIndex } from '../../src/core/MemoryIndex';

describe('Feature 8, Story 4: Error Reporting Mechanisms', () => {
    describe('Output Channel Integration (already tested in Story 1)', () => {
        let errorReporter: ErrorReporter;

        beforeEach(() => {
            errorReporter = ErrorReporter.getInstance();
            errorReporter.clearHistory();
        });

        afterEach(() => {
            errorReporter.clearHistory();
        });

        it('should have dedicated output channel', () => {
            // ErrorReporter creates output channel in constructor
            expect(errorReporter).toBeDefined();
        });

        it('should log detailed error messages to output channel', () => {
            errorReporter.reportError('Test error', '/test/file.md', 'Detailed information');

            const history = errorReporter.getErrorHistory();
            expect(history).toHaveLength(1);
            expect(history[0].details).toBe('Detailed information');
        });
    });

    describe('Status Bar Integration', () => {
        let statusBarManager: StatusBarManager;
        let memoryIndex: MemoryIndex;
        let errorReporter: ErrorReporter;

        beforeEach(() => {
            memoryIndex = new MemoryIndex();
            errorReporter = ErrorReporter.getInstance();
            errorReporter.clearHistory();

            statusBarManager = StatusBarManager.getInstance();
            statusBarManager.setMemoryIndex(memoryIndex);
            statusBarManager.setErrorReporter(errorReporter);
        });

        afterEach(() => {
            errorReporter.clearHistory();
        });

        describe('High-level status display', () => {
            it('should show number of indexed memories', () => {
                memoryIndex.add('/file1.md', { title: 'Test 1', tags: ['test'] }, 'Content 1');
                memoryIndex.add('/file2.md', { title: 'Test 2', tags: ['test'] }, 'Content 2');

                statusBarManager.updateStatusBar();

                const statusBarItem = statusBarManager.getStatusBarItem();
                expect(statusBarItem.text).toContain('2');
            });

            it('should show database icon when no errors', () => {
                memoryIndex.add('/file1.md', { title: 'Test', tags: ['test'] }, 'Content');
                statusBarManager.updateStatusBar();

                const statusBarItem = statusBarManager.getStatusBarItem();
                expect(statusBarItem.text).toContain('$(database)');
            });

            it('should show error icon when errors are present', () => {
                errorReporter.reportError('Test error', '/file.md');
                statusBarManager.updateStatusBar();

                const statusBarItem = statusBarManager.getStatusBarItem();
                expect(statusBarItem.text).toContain('$(error)');
            });

            it('should show error count when errors present', () => {
                errorReporter.reportError('Error 1', '/file1.md');
                errorReporter.reportError('Error 2', '/file2.md');
                errorReporter.reportError('Error 3', '/file3.md');

                statusBarManager.updateStatusBar();

                const statusBarItem = statusBarManager.getStatusBarItem();
                expect(statusBarItem.text).toContain('3 errors');
            });

            it('should show both memory count and error count', () => {
                memoryIndex.add('/file1.md', { title: 'Test 1', tags: ['test'] }, 'Content');
                memoryIndex.add('/file2.md', { title: 'Test 2', tags: ['test'] }, 'Content');
                errorReporter.reportError('Error', '/file3.md');

                statusBarManager.updateStatusBar();

                const statusBarItem = statusBarManager.getStatusBarItem();
                expect(statusBarItem.text).toContain('2 files');
                expect(statusBarItem.text).toContain('1 errors');
            });
        });

        describe('Status bar tooltip', () => {
            it('should show descriptive tooltip with memory count', () => {
                memoryIndex.add('/file1.md', { title: 'Test', tags: ['test'] }, 'Content');
                statusBarManager.updateStatusBar();

                const statusBarItem = statusBarManager.getStatusBarItem();
                expect(statusBarItem.tooltip).toContain('1 indexed memories');
            });

            it('should show error count in tooltip', () => {
                errorReporter.reportError('Error', '/file.md');
                statusBarManager.updateStatusBar();

                const statusBarItem = statusBarManager.getStatusBarItem();
                expect(statusBarItem.tooltip).toContain('1 errors');
            });

            it('should instruct user to click to view output', () => {
                statusBarManager.updateStatusBar();

                const statusBarItem = statusBarManager.getStatusBarItem();
                expect(statusBarItem.tooltip).toContain('Click to view output');
            });
        });

        describe('Status bar command', () => {
            it('should have command registered to show output', () => {
                const statusBarItem = statusBarManager.getStatusBarItem();
                expect(statusBarItem.command).toBe('memoryManager.showOutput');
            });
        });

        describe('Visual indicators', () => {
            it('should use error background when errors present', () => {
                errorReporter.reportError('Error', '/file.md');
                statusBarManager.updateStatusBar();

                const statusBarItem = statusBarManager.getStatusBarItem();
                expect(statusBarItem.backgroundColor).toBeDefined();
            });

            it('should not use error background when no errors', () => {
                memoryIndex.add('/file.md', { title: 'Test', tags: ['test'] }, 'Content');
                statusBarManager.updateStatusBar();

                const statusBarItem = statusBarManager.getStatusBarItem();
                expect(statusBarItem.backgroundColor).toBeUndefined();
            });
        });

        describe('Temporary status messages', () => {
            it('should show success message temporarily', () => {
                statusBarManager.showSuccess('File indexed successfully', 100);

                const statusBarItem = statusBarManager.getStatusBarItem();
                expect(statusBarItem.text).toContain('$(check)');
                expect(statusBarItem.text).toContain('File indexed successfully');
            });

            it('should show error message temporarily', () => {
                statusBarManager.showError('Failed to index file', 100);

                const statusBarItem = statusBarManager.getStatusBarItem();
                expect(statusBarItem.text).toContain('$(error)');
                expect(statusBarItem.text).toContain('Failed to index file');
            });
        });

        describe('Status tracking', () => {
            it('should track if there are active errors', () => {
                errorReporter.reportError('Error', '/file.md');
                statusBarManager.updateStatusBar();

                expect(statusBarManager.hasActiveErrors()).toBe(true);
            });

            it('should track memory count', () => {
                memoryIndex.add('/file1.md', { title: 'Test', tags: ['test'] }, 'Content');
                memoryIndex.add('/file2.md', { title: 'Test', tags: ['test'] }, 'Content');
                statusBarManager.updateStatusBar();

                expect(statusBarManager.getMemoryCount()).toBe(2);
            });

            it('should track error count', () => {
                errorReporter.reportError('Error 1', '/file1.md');
                errorReporter.reportError('Error 2', '/file2.md');
                statusBarManager.updateStatusBar();

                expect(statusBarManager.getErrorCount()).toBe(2);
            });
        });

        describe('Singleton pattern', () => {
            it('should return same instance', () => {
                const instance1 = StatusBarManager.getInstance();
                const instance2 = StatusBarManager.getInstance();

                expect(instance1).toBe(instance2);
            });
        });
    });

    describe('Problems Panel Integration (already tested in Story 2)', () => {
        let diagnosticReporter: DiagnosticReporter;

        beforeEach(() => {
            diagnosticReporter = DiagnosticReporter.getInstance();
            diagnosticReporter.clearAll();
        });

        afterEach(() => {
            diagnosticReporter.clearAll();
        });

        it('should report file-specific errors to Problems Panel', () => {
            diagnosticReporter.reportValidationError('/test/file.md', 'Missing required field');

            const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/file.md');
            expect(diagnostics).toHaveLength(1);
        });

        it('should list errors in Problems panel', () => {
            diagnosticReporter.reportValidationError('/file1.md', 'Error 1');
            diagnosticReporter.reportValidationError('/file2.md', 'Error 2');

            const allDiagnostics = diagnosticReporter.getAllDiagnostics();
            expect(allDiagnostics.size).toBe(2);
        });
    });

    describe('Integrated error reporting', () => {
        let errorReporter: ErrorReporter;
        let diagnosticReporter: DiagnosticReporter;
        let statusBarManager: StatusBarManager;
        let memoryIndex: MemoryIndex;

        beforeEach(() => {
            errorReporter = ErrorReporter.getInstance();
            diagnosticReporter = DiagnosticReporter.getInstance();
            statusBarManager = StatusBarManager.getInstance();
            memoryIndex = new MemoryIndex();

            errorReporter.clearHistory();
            diagnosticReporter.clearAll();

            statusBarManager.setMemoryIndex(memoryIndex);
            statusBarManager.setErrorReporter(errorReporter);
        });

        afterEach(() => {
            errorReporter.clearHistory();
            diagnosticReporter.clearAll();
        });

        it('should report to all three mechanisms simultaneously', () => {
            const filePath = '/test/error.md';
            const errorMessage = 'Test error';

            // Report error to all mechanisms
            errorReporter.reportError(errorMessage, filePath);
            diagnosticReporter.reportValidationError(filePath, errorMessage);
            statusBarManager.updateStatusBar();

            // Verify in Output Channel
            const errorHistory = errorReporter.getErrorHistory();
            expect(errorHistory).toHaveLength(1);

            // Verify in Problems Panel
            const diagnostics = diagnosticReporter.getDiagnosticsForFile(filePath);
            expect(diagnostics).toHaveLength(1);

            // Verify in Status Bar
            const statusBarItem = statusBarManager.getStatusBarItem();
            expect(statusBarItem.text).toContain('$(error)');
        });

        it('should provide comprehensive error visibility', () => {
            // Add some valid files
            memoryIndex.add('/valid1.md', { title: 'Test 1', tags: ['test'] }, 'Content');
            memoryIndex.add('/valid2.md', { title: 'Test 2', tags: ['test'] }, 'Content');

            // Report errors
            errorReporter.reportError('Parse error', '/bad1.md');
            errorReporter.reportError('Validation error', '/bad2.md');
            diagnosticReporter.reportValidationError('/bad1.md', 'Parse error');
            diagnosticReporter.reportValidationError('/bad2.md', 'Validation error');

            statusBarManager.updateStatusBar();

            // Status bar shows overview
            const statusBarItem = statusBarManager.getStatusBarItem();
            expect(statusBarItem.text).toContain('2 files');
            expect(statusBarItem.text).toContain('2 errors');

            // Output channel has detailed logs
            const errorHistory = errorReporter.getErrorHistory();
            expect(errorHistory).toHaveLength(2);

            // Problems panel has file-specific issues
            const allDiagnostics = diagnosticReporter.getAllDiagnostics();
            expect(allDiagnostics.size).toBe(2);
        });

        it('should update status bar as errors are resolved', () => {
            // Start with errors
            errorReporter.reportError('Error', '/file.md');
            diagnosticReporter.reportValidationError('/file.md', 'Error');
            statusBarManager.updateStatusBar();
            expect(statusBarManager.hasActiveErrors()).toBe(true);

            // Fix the error
            diagnosticReporter.clearDiagnostics('/file.md');
            errorReporter.clearHistory();
            statusBarManager.updateStatusBar();

            expect(statusBarManager.hasActiveErrors()).toBe(false);
            const statusBarItem = statusBarManager.getStatusBarItem();
            expect(statusBarItem.text).not.toContain('$(error)');
        });
    });
});
