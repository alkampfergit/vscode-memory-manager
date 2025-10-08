/**
 * Feature 8, Story 2: YAML Frontmatter Validation
 *
 * Tests that YAML validation errors are properly reported:
 * - Detailed error messages with file path
 * - Files excluded from index until fixed
 * - Errors shown in Problems Panel via Diagnostics
 */

import * as vscode from 'vscode';
import { DiagnosticReporter } from '../../src/core/DiagnosticReporter';
import { MemorySynchronizationService } from '../../src/core/MemorySynchronizationService';
import { MemoryIndex } from '../../src/core/MemoryIndex';
import { TagSystem } from '../../src/core/TagSystem';
import { FrontmatterValidationError, FrontmatterParseError } from '../../src/core/MemoryFileParser';

describe('Feature 8, Story 2: YAML Frontmatter Validation', () => {
    describe('DiagnosticReporter', () => {
        let diagnosticReporter: DiagnosticReporter;

        beforeEach(() => {
            diagnosticReporter = DiagnosticReporter.getInstance();
            diagnosticReporter.clearAll();
        });

        afterEach(() => {
            diagnosticReporter.clearAll();
        });

        describe('Validation error reporting', () => {
            it('should report validation errors to Problems Panel', () => {
                diagnosticReporter.reportValidationError(
                    '/test/file.md',
                    'Missing required field: title'
                );

                const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/file.md');

                expect(diagnostics).toHaveLength(1);
                expect(diagnostics[0].message).toBe('Missing required field: title');
                expect(diagnostics[0].severity).toBe(vscode.DiagnosticSeverity.Error);
            });

            it('should include file path in diagnostic', () => {
                const filePath = '/memory/backend.md';
                diagnosticReporter.reportValidationError(filePath, 'Error message');

                const allDiagnostics = diagnosticReporter.getAllDiagnostics();

                expect(allDiagnostics.has(filePath)).toBe(true);
            });

            it('should set diagnostic source to Memory Manager', () => {
                diagnosticReporter.reportValidationError('/test/file.md', 'Error');

                const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/file.md');

                expect(diagnostics[0].source).toBe('Memory Manager');
            });

            it('should create diagnostic at specified line', () => {
                diagnosticReporter.reportValidationError('/test/file.md', 'Error', 5);

                const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/file.md');

                expect(diagnostics[0].range.start.line).toBe(5);
            });

            it('should default to line 0 for validation errors', () => {
                diagnosticReporter.reportValidationError('/test/file.md', 'Error');

                const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/file.md');

                expect(diagnostics[0].range.start.line).toBe(0);
            });
        });

        describe('YAML-specific error reporting', () => {
            it('should report YAML parsing errors', () => {
                const error = new FrontmatterParseError('Invalid YAML syntax');

                diagnosticReporter.reportYAMLError('/test/file.md', error);

                const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/file.md');

                expect(diagnostics[0].message).toContain('YAML Frontmatter Error');
                expect(diagnostics[0].message).toContain('Invalid YAML syntax');
            });

            it('should report missing field errors', () => {
                diagnosticReporter.reportMissingFieldError('/test/file.md', 'title');

                const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/file.md');

                expect(diagnostics[0].message).toBe('Missing required field: title');
            });

            it('should report field type errors', () => {
                diagnosticReporter.reportFieldTypeError('/test/file.md', 'tags', 'an array');

                const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/file.md');

                expect(diagnostics[0].message).toBe('Field "tags" must be an array');
            });
        });

        describe('Diagnostic management', () => {
            it('should clear diagnostics for specific file', () => {
                diagnosticReporter.reportValidationError('/test/file1.md', 'Error 1');
                diagnosticReporter.reportValidationError('/test/file2.md', 'Error 2');

                diagnosticReporter.clearDiagnostics('/test/file1.md');

                const file1Diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/file1.md');
                const file2Diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/file2.md');

                expect(file1Diagnostics).toHaveLength(0);
                expect(file2Diagnostics).toHaveLength(1);
            });

            it('should clear all diagnostics', () => {
                diagnosticReporter.reportValidationError('/test/file1.md', 'Error 1');
                diagnosticReporter.reportValidationError('/test/file2.md', 'Error 2');
                diagnosticReporter.reportValidationError('/test/file3.md', 'Error 3');

                diagnosticReporter.clearAll();

                const allDiagnostics = diagnosticReporter.getAllDiagnostics();
                expect(allDiagnostics.size).toBe(0);
            });

            it('should return empty array for file with no diagnostics', () => {
                const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/nonexistent.md');

                expect(diagnostics).toHaveLength(0);
            });

            it('should override previous diagnostic for same file', () => {
                diagnosticReporter.reportValidationError('/test/file.md', 'First error');
                diagnosticReporter.reportValidationError('/test/file.md', 'Second error');

                const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/file.md');

                expect(diagnostics).toHaveLength(1);
                expect(diagnostics[0].message).toBe('Second error');
            });
        });

        describe('Singleton pattern', () => {
            it('should return same instance', () => {
                const instance1 = DiagnosticReporter.getInstance();
                const instance2 = DiagnosticReporter.getInstance();

                expect(instance1).toBe(instance2);
            });

            it('should share diagnostics across instances', () => {
                const instance1 = DiagnosticReporter.getInstance();
                instance1.reportValidationError('/test/file.md', 'Shared error');

                const instance2 = DiagnosticReporter.getInstance();
                const diagnostics = instance2.getDiagnosticsForFile('/test/file.md');

                expect(diagnostics).toHaveLength(1);
                expect(diagnostics[0].message).toBe('Shared error');
            });
        });
    });

    describe('Integration with MemorySynchronizationService', () => {
        let memoryIndex: MemoryIndex;
        let tagSystem: TagSystem;
        let syncService: MemorySynchronizationService;
        let diagnosticReporter: DiagnosticReporter;

        beforeEach(() => {
            memoryIndex = new MemoryIndex();
            tagSystem = new TagSystem();
            syncService = new MemorySynchronizationService(memoryIndex, tagSystem);
            diagnosticReporter = DiagnosticReporter.getInstance();
            diagnosticReporter.clearAll();
        });

        afterEach(() => {
            diagnosticReporter.clearAll();
        });

        describe('Validation errors exclude files from index', () => {
            it('should not add file to index if YAML is invalid', async () => {
                const mockUri = vscode.Uri.file('/test/invalid.md');
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('No frontmatter here')
                );

                await syncService.handleFileCreateOrChange(mockUri);

                // File should NOT be in index
                expect(memoryIndex.has('/test/invalid.md')).toBe(false);
            });

            it('should not add file to index if title is missing', async () => {
                const mockUri = vscode.Uri.file('/test/no-title.md');
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('---\ntags: [test]\n---\nContent')
                );

                await syncService.handleFileCreateOrChange(mockUri);

                expect(memoryIndex.has('/test/no-title.md')).toBe(false);
            });

            it('should not add file to index if tags are missing', async () => {
                const mockUri = vscode.Uri.file('/test/no-tags.md');
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('---\ntitle: Test\n---\nContent')
                );

                await syncService.handleFileCreateOrChange(mockUri);

                expect(memoryIndex.has('/test/no-tags.md')).toBe(false);
            });

            it('should not add tags to tag system if validation fails', async () => {
                const mockUri = vscode.Uri.file('/test/invalid.md');
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('---\ntitle: Test\n---\nContent')
                );

                await syncService.handleFileCreateOrChange(mockUri);

                expect(tagSystem.size()).toBe(0);
            });
        });

        describe('Diagnostic reporting for validation errors', () => {
            it('should report missing title to Problems Panel', async () => {
                const mockUri = vscode.Uri.file('/test/no-title.md');
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('---\ntags: [test]\n---\nContent')
                );

                await syncService.handleFileCreateOrChange(mockUri);

                const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/no-title.md');
                expect(diagnostics).toHaveLength(1);
                expect(diagnostics[0].message).toContain('title');
            });

            it('should report missing tags to Problems Panel', async () => {
                const mockUri = vscode.Uri.file('/test/no-tags.md');
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('---\ntitle: Test\n---\nContent')
                );

                await syncService.handleFileCreateOrChange(mockUri);

                const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/no-tags.md');
                expect(diagnostics).toHaveLength(1);
                expect(diagnostics[0].message).toContain('tags');
            });

            it('should report YAML parse errors to Problems Panel', async () => {
                const mockUri = vscode.Uri.file('/test/malformed.md');
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('---\ntitle: "Unclosed quote\ntags: [test]\n---\nContent')
                );

                await syncService.handleFileCreateOrChange(mockUri);

                const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/malformed.md');
                expect(diagnostics).toHaveLength(1);
                expect(diagnostics[0].message).toContain('YAML');
            });

            it('should include clear description of what is wrong', async () => {
                const mockUri = vscode.Uri.file('/test/empty-tags.md');
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('---\ntitle: Test\ntags: []\n---\nContent')
                );

                await syncService.handleFileCreateOrChange(mockUri);

                const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/empty-tags.md');
                expect(diagnostics[0].message).toMatch(/tags.*at least one/i);
            });
        });

        describe('File recovery on fix', () => {
            it('should add file to index when fixed', async () => {
                const mockUri = vscode.Uri.file('/test/fixable.md');

                // First: invalid file
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('---\ntags: [test]\n---\nContent')
                );
                await syncService.handleFileCreateOrChange(mockUri);
                expect(memoryIndex.has('/test/fixable.md')).toBe(false);

                // Then: fixed file
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('---\ntitle: Fixed\ntags: [test]\n---\nContent')
                );
                await syncService.handleFileCreateOrChange(mockUri);
                expect(memoryIndex.has('/test/fixable.md')).toBe(true);
            });

            it('should clear diagnostics when file is fixed', async () => {
                const mockUri = vscode.Uri.file('/test/fixable.md');

                // First: invalid file
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('---\ntags: [test]\n---\nContent')
                );
                await syncService.handleFileCreateOrChange(mockUri);
                expect(diagnosticReporter.getDiagnosticsForFile('/test/fixable.md')).toHaveLength(1);

                // Then: fixed file
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('---\ntitle: Fixed\ntags: [test]\n---\nContent')
                );
                await syncService.handleFileCreateOrChange(mockUri);
                expect(diagnosticReporter.getDiagnosticsForFile('/test/fixable.md')).toHaveLength(0);
            });
        });

        describe('File deletion clears diagnostics', () => {
            it('should clear diagnostics when file is deleted', async () => {
                // First: create invalid file
                const mockUri = vscode.Uri.file('/test/to-delete.md');
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('Invalid')
                );
                await syncService.handleFileCreateOrChange(mockUri);
                expect(diagnosticReporter.getDiagnosticsForFile('/test/to-delete.md')).toHaveLength(1);

                // Then: delete file
                syncService.handleFileDelete(mockUri);
                expect(diagnosticReporter.getDiagnosticsForFile('/test/to-delete.md')).toHaveLength(0);
            });
        });

        describe('Detailed error messages', () => {
            it('should include file path in error context', async () => {
                const filePath = '/memory/backend/database.md';
                const mockUri = vscode.Uri.file(filePath);
                (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                    Buffer.from('---\ntitle: Test\n---\nContent')
                );

                await syncService.handleFileCreateOrChange(mockUri);

                const allDiagnostics = diagnosticReporter.getAllDiagnostics();
                expect(allDiagnostics.has(filePath)).toBe(true);
            });

            it('should provide actionable error messages', async () => {
                const testCases = [
                    {
                        content: '---\ntags: [test]\n---\nContent',
                        expectedMessage: /title/i
                    },
                    {
                        content: '---\ntitle: Test\n---\nContent',
                        expectedMessage: /tags/i
                    },
                    {
                        content: '---\ntitle: Test\ntags: []\n---\nContent',
                        expectedMessage: /at least one/i
                    }
                ];

                for (const testCase of testCases) {
                    const mockUri = vscode.Uri.file('/test/file.md');
                    (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                        Buffer.from(testCase.content)
                    );
                    diagnosticReporter.clearAll();

                    await syncService.handleFileCreateOrChange(mockUri);

                    const diagnostics = diagnosticReporter.getDiagnosticsForFile('/test/file.md');
                    expect(diagnostics[0].message).toMatch(testCase.expectedMessage);
                }
            });
        });
    });
});
