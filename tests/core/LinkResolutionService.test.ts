import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { LinkResolutionService } from '../../src/core/LinkResolutionService';
import { ParsedLink } from '../../src/core/MarkdownLinkParser';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('LinkResolutionService', () => {
    let service: LinkResolutionService;
    let tempDir: string;
    let baseFilePath: string;

    beforeEach(async () => {
        service = new LinkResolutionService();

        // Create a temporary directory for test files
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'link-resolution-test-'));

        // Create a base file
        baseFilePath = path.join(tempDir, 'base.md');
        await fs.promises.writeFile(baseFilePath, '# Base File\n\nThis is the base file.');
    });

    afterEach(async () => {
        // Clean up temporary directory
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    describe('Relative path resolution', () => {
        it('should resolve a link to a file in the same directory', async () => {
            // Create a linked file
            const linkedFilePath = path.join(tempDir, 'linked.md');
            await fs.promises.writeFile(linkedFilePath, '# Linked File\n\nLinked content.');

            const links: ParsedLink[] = [
                {
                    text: 'Linked',
                    path: './linked.md',
                    fullSyntax: '[Linked](./linked.md)',
                    startIndex: 0,
                    endIndex: 22
                }
            ];

            const results = await service.resolveLinks(baseFilePath, links);

            expect(results.size).toBe(1);
            const resolved = results.get('./linked.md');
            expect(resolved).toBeDefined();
            expect(resolved!.originalPath).toBe('./linked.md');
            expect(resolved!.resolvedPath).toBe(linkedFilePath);
            expect(resolved!.content).toBe('# Linked File\n\nLinked content.');
            expect(resolved!.error).toBeUndefined();
        });

        it('should resolve a link to a file in a subdirectory', async () => {
            // Create subdirectory and file
            const subDir = path.join(tempDir, 'subfolder');
            await fs.promises.mkdir(subDir);
            const linkedFilePath = path.join(subDir, 'linked.md');
            await fs.promises.writeFile(linkedFilePath, 'Subfolder content.');

            const links: ParsedLink[] = [
                {
                    text: 'Link',
                    path: './subfolder/linked.md',
                    fullSyntax: '[Link](./subfolder/linked.md)',
                    startIndex: 0,
                    endIndex: 30
                }
            ];

            const results = await service.resolveLinks(baseFilePath, links);

            expect(results.size).toBe(1);
            const resolved = results.get('./subfolder/linked.md');
            expect(resolved).toBeDefined();
            expect(resolved!.content).toBe('Subfolder content.');
        });

        it('should resolve a link to a file in parent directory', async () => {
            // Create a subdirectory and base file in it
            const subDir = path.join(tempDir, 'subfolder');
            await fs.promises.mkdir(subDir);
            const subBaseFile = path.join(subDir, 'base.md');
            await fs.promises.writeFile(subBaseFile, 'Base in subfolder.');

            // Create a file in parent directory
            const parentFile = path.join(tempDir, 'parent.md');
            await fs.promises.writeFile(parentFile, 'Parent content.');

            const links: ParsedLink[] = [
                {
                    text: 'Parent',
                    path: '../parent.md',
                    fullSyntax: '[Parent](../parent.md)',
                    startIndex: 0,
                    endIndex: 22
                }
            ];

            const results = await service.resolveLinks(subBaseFile, links);

            expect(results.size).toBe(1);
            const resolved = results.get('../parent.md');
            expect(resolved).toBeDefined();
            expect(resolved!.content).toBe('Parent content.');
        });
    });

    describe('Absolute path resolution', () => {
        it('should resolve an absolute path', async () => {
            const absoluteFilePath = path.join(tempDir, 'absolute.md');
            await fs.promises.writeFile(absoluteFilePath, 'Absolute content.');

            const links: ParsedLink[] = [
                {
                    text: 'Absolute',
                    path: absoluteFilePath,
                    fullSyntax: `[Absolute](${absoluteFilePath})`,
                    startIndex: 0,
                    endIndex: 10 + absoluteFilePath.length
                }
            ];

            const results = await service.resolveLinks(baseFilePath, links);

            expect(results.size).toBe(1);
            const resolved = results.get(absoluteFilePath);
            expect(resolved).toBeDefined();
            expect(resolved!.content).toBe('Absolute content.');
        });
    });

    describe('Error handling', () => {
        it('should handle non-existent files gracefully', async () => {
            const links: ParsedLink[] = [
                {
                    text: 'Missing',
                    path: './missing.md',
                    fullSyntax: '[Missing](./missing.md)',
                    startIndex: 0,
                    endIndex: 23
                }
            ];

            const results = await service.resolveLinks(baseFilePath, links);

            expect(results.size).toBe(1);
            const resolved = results.get('./missing.md');
            expect(resolved).toBeDefined();
            expect(resolved!.originalPath).toBe('./missing.md');
            expect(resolved!.resolvedPath).toBeNull();
            expect(resolved!.content).toBeNull();
            expect(resolved!.error).toBeDefined();
            expect(resolved!.error).toContain('Failed to read file');
        });

        it('should skip URL links', async () => {
            const links: ParsedLink[] = [
                {
                    text: 'Website',
                    path: 'https://example.com',
                    fullSyntax: '[Website](https://example.com)',
                    startIndex: 0,
                    endIndex: 31
                }
            ];

            const results = await service.resolveLinks(baseFilePath, links);

            expect(results.size).toBe(1);
            const resolved = results.get('https://example.com');
            expect(resolved).toBeDefined();
            expect(resolved!.resolvedPath).toBeNull();
            expect(resolved!.content).toBeNull();
            expect(resolved!.error).toBe('URLs are not resolved');
        });
    });

    describe('Multiple links', () => {
        it('should resolve multiple links correctly', async () => {
            // Create multiple linked files
            const file1 = path.join(tempDir, 'file1.md');
            const file2 = path.join(tempDir, 'file2.md');
            await fs.promises.writeFile(file1, 'Content 1');
            await fs.promises.writeFile(file2, 'Content 2');

            const links: ParsedLink[] = [
                {
                    text: 'File 1',
                    path: './file1.md',
                    fullSyntax: '[File 1](./file1.md)',
                    startIndex: 0,
                    endIndex: 20
                },
                {
                    text: 'File 2',
                    path: './file2.md',
                    fullSyntax: '[File 2](./file2.md)',
                    startIndex: 21,
                    endIndex: 41
                }
            ];

            const results = await service.resolveLinks(baseFilePath, links);

            expect(results.size).toBe(2);
            expect(results.get('./file1.md')!.content).toBe('Content 1');
            expect(results.get('./file2.md')!.content).toBe('Content 2');
        });

        it('should handle mix of successful and failed resolutions', async () => {
            // Create only one of the files
            const file1 = path.join(tempDir, 'exists.md');
            await fs.promises.writeFile(file1, 'Exists');

            const links: ParsedLink[] = [
                {
                    text: 'Exists',
                    path: './exists.md',
                    fullSyntax: '[Exists](./exists.md)',
                    startIndex: 0,
                    endIndex: 21
                },
                {
                    text: 'Missing',
                    path: './missing.md',
                    fullSyntax: '[Missing](./missing.md)',
                    startIndex: 22,
                    endIndex: 45
                }
            ];

            const results = await service.resolveLinks(baseFilePath, links);

            expect(results.size).toBe(2);
            expect(results.get('./exists.md')!.content).toBe('Exists');
            expect(results.get('./exists.md')!.error).toBeUndefined();
            expect(results.get('./missing.md')!.content).toBeNull();
            expect(results.get('./missing.md')!.error).toBeDefined();
        });
    });

    describe('Empty input', () => {
        it('should return empty map for empty link array', async () => {
            const results = await service.resolveLinks(baseFilePath, []);

            expect(results.size).toBe(0);
        });
    });

    describe('Duplicate links', () => {
        it('should handle duplicate link paths correctly', async () => {
            const linkedFile = path.join(tempDir, 'linked.md');
            await fs.promises.writeFile(linkedFile, 'Linked content');

            const links: ParsedLink[] = [
                {
                    text: 'Link 1',
                    path: './linked.md',
                    fullSyntax: '[Link 1](./linked.md)',
                    startIndex: 0,
                    endIndex: 21
                },
                {
                    text: 'Link 2',
                    path: './linked.md',
                    fullSyntax: '[Link 2](./linked.md)',
                    startIndex: 22,
                    endIndex: 43
                }
            ];

            const results = await service.resolveLinks(baseFilePath, links);

            // The map should only have one entry for the duplicate path
            // (the last one overwrites)
            expect(results.size).toBe(1);
            expect(results.get('./linked.md')!.content).toBe('Linked content');
        });
    });
});
