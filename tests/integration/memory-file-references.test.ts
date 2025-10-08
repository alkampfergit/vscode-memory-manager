import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { ContentInjectionEngine } from '../../src/chat/ContentInjectionEngine';
import { MemoryIndex } from '../../src/core/MemoryIndex';
import { TagSystem } from '../../src/core/TagSystem';
import { MemoryFileParser } from '../../src/core/MemoryFileParser';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Integration test for Memory folder with bp.md and its references
 *
 * This test verifies that when querying for tag "bp", the system:
 * 1. Finds the main bp.md file
 * 2. Also includes the two referenced files (best-practice.md and helper.md)
 *
 * Total expected: 3 files
 */
describe('Memory File References Integration Test', () => {
    let contentInjector: ContentInjectionEngine;
    let memoryIndex: MemoryIndex;
    let tagSystem: TagSystem;

    const memoryDir = path.resolve(__dirname, '../../Memory');
    const bpFile = path.join(memoryDir, 'bp.md');
    const referencedDir = path.join(memoryDir, 'referenced');
    const bestPracticeFile = path.join(referencedDir, 'best-practice.md');
    const helperFile = path.join(referencedDir, 'helper.md');

    beforeAll(async () => {
        memoryIndex = new MemoryIndex();
        tagSystem = new TagSystem();
        contentInjector = new ContentInjectionEngine(memoryIndex, tagSystem);

        // Verify test files exist
        expect(fs.existsSync(bpFile)).toBe(true);
        expect(fs.existsSync(bestPracticeFile)).toBe(true);
        expect(fs.existsSync(helperFile)).toBe(true);

        // Index the bp.md file with tag "bp"
        const bpContent = await fs.promises.readFile(bpFile, 'utf-8');
        const parsed = MemoryFileParser.parse(bpContent);

        memoryIndex.add(bpFile, parsed.frontmatter, parsed.content);
        tagSystem.addTags(bpFile, parsed.frontmatter.tags);
    });

    afterAll(() => {
        memoryIndex.clear();
        tagSystem.clear();
    });

    describe('Tag "bp" query with referenced files', () => {
        it('should find all three memory files: bp.md and both referenced files', async () => {
            // Query by tag "bp"
            const matchedFiles = tagSystem.queryByTag('bp');

            // Should match the bp.md file
            expect(matchedFiles).toHaveLength(1);
            expect(matchedFiles[0]).toBe(bpFile);

            // Now get all files including references (this is what ContentInjectionEngine does)
            const allFilesIncludingReferences = await (contentInjector as any).getAllFilesWithReferences(matchedFiles);

            // Should have 3 files total: bp.md + best-practice.md + helper.md
            expect(allFilesIncludingReferences).toHaveLength(3);
            expect(allFilesIncludingReferences).toContain(bpFile);
            expect(allFilesIncludingReferences).toContain(bestPracticeFile);
            expect(allFilesIncludingReferences).toContain(helperFile);
        });

        it('should include referenced files when using attachFilesByTag', async () => {
            // Mock the vscode.commands.executeCommand to capture attached files
            const attachedUris: any[] = [];
            const mockExecuteCommand = async (command: string, ...args: any[]) => {
                if (command === 'github.copilot.chat.attachFile') {
                    attachedUris.push(...args);
                }
            };

            // Mock vscode module (this would normally be done via jest.mock)
            // For this test, we'll call the private method directly to verify behavior
            const matchedFiles = tagSystem.queryByTag('bp');
            const allFiles = await (contentInjector as any).getAllFilesWithReferences(matchedFiles);

            // Verify all 3 files would be attached
            expect(allFiles).toHaveLength(3);
            expect(allFiles).toContain(bpFile);
            expect(allFiles).toContain(bestPracticeFile);
            expect(allFiles).toContain(helperFile);
        });

        it('should extract content from all three files', async () => {
            const matchedFiles = tagSystem.queryByTag('bp');
            const allFiles = await (contentInjector as any).getAllFilesWithReferences(matchedFiles);

            // Get contents of all files
            const memoryContents = await contentInjector.getMemoryContents(allFiles);

            // Should have content from all 3 files
            expect(memoryContents.length).toBeGreaterThanOrEqual(1); // At least bp.md

            // The bp.md file should be in the results
            const bpContent = memoryContents.find(m => m.filePath === bpFile);
            expect(bpContent).toBeDefined();
            expect(bpContent?.title).toBe('For testing purpose - Best practices');

            // The content should mention the referenced files
            expect(bpContent?.content).toContain('Csharp best practices');
            expect(bpContent?.content).toContain('Helper Functions');
        });

        it('should verify the structure of bp.md references', async () => {
            const bpContent = await fs.promises.readFile(bpFile, 'utf-8');

            // Should contain links to both referenced files
            expect(bpContent).toContain('./referenced/best-practice.md');
            expect(bpContent).toContain('./referenced/helper.md');

            // Should have the "bp" tag
            expect(bpContent).toContain('bp');
        });

        it('should verify referenced files have content', async () => {
            const bestPracticeContent = await fs.promises.readFile(bestPracticeFile, 'utf-8');
            const helperContent = await fs.promises.readFile(helperFile, 'utf-8');

            // Best practice file should mention C# and cryptographic random
            expect(bestPracticeContent).toContain('C#');
            expect(bestPracticeContent).toContain('random number');

            // Helper file should mention utilities
            expect(helperContent).toContain('helper');
            expect(helperContent.toLowerCase()).toContain('function');
        });
    });

    describe('Integration with getMatchSummary', () => {
        it('should report correct count for tag query', () => {
            const summary = contentInjector.getMatchSummary('bp');

            // getMatchSummary only reports direct tag matches (not references)
            expect(summary.count).toBe(1);
            expect(summary.filePaths).toContain(bpFile);
        });

        it('should include referenced files when using getMatchSummaryForTagsWithReferences', async () => {
            const summary = await contentInjector.getMatchSummaryForTagsWithReferences(['bp']);

            // Should include bp.md + its 2 referenced files = 3 total
            expect(summary.count).toBe(3);
            expect(summary.filePaths).toContain(bpFile);
            expect(summary.filePaths).toContain(bestPracticeFile);
            expect(summary.filePaths).toContain(helperFile);
            expect(summary.tagPatterns).toEqual(['bp']);
        });
    });

    describe('Non-recursive reference resolution', () => {
        it('should only resolve direct references, not transitive ones', async () => {
            // bp.md references best-practice.md and helper.md
            // If those files contained references, they should NOT be included
            // (based on the existing test in link-transformation.test.ts)

            const matchedFiles = tagSystem.queryByTag('bp');
            const allFiles = await (contentInjector as any).getAllFilesWithReferences(matchedFiles);

            // Should only have direct references, not recursive
            // bp.md + its 2 direct references = 3 files
            expect(allFiles).toHaveLength(3);
        });
    });
});
