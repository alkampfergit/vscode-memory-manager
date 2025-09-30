import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MemorySynchronizationService } from '../../src/core/MemorySynchronizationService';
import { MemoryIndex } from '../../src/core/MemoryIndex';
import { TagSystem } from '../../src/core/TagSystem';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode');

describe('MemorySynchronizationService', () => {
    let service: MemorySynchronizationService;
    let memoryIndex: MemoryIndex;
    let tagSystem: TagSystem;

    const validFileContent = `---
title: "Test Memory"
tags:
  - "backend.database"
  - "testing"
---

# Test Content

This is test content.`;

    beforeEach(() => {
        memoryIndex = new MemoryIndex();
        tagSystem = new TagSystem();
        service = new MemorySynchronizationService(memoryIndex, tagSystem);

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('handleFileCreateOrChange', () => {
        it('should add new file to index and tag system', async () => {
            const uri = vscode.Uri.file('/test/file.md');

            // Mock file read
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(validFileContent, 'utf8')
            );

            await service.handleFileCreateOrChange(uri);

            // Check that file was added to index
            expect(memoryIndex.has(uri.fsPath)).toBe(true);

            const entry = memoryIndex.get(uri.fsPath);
            expect(entry?.frontmatter.title).toBe('Test Memory');
            expect(entry?.frontmatter.tags).toEqual(['backend.database', 'testing']);

            // Check that tags were added to tag system
            expect(tagSystem.queryByTag('backend.database')).toContain(uri.fsPath);
            expect(tagSystem.queryByTag('testing')).toContain(uri.fsPath);
        });

        it('should update existing file in index and tag system', async () => {
            const uri = vscode.Uri.file('/test/file.md');

            // First, add a file with different tags
            const initialContent = `---
title: "Initial Title"
tags:
  - "old.tag"
---

Initial content.`;

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(initialContent, 'utf8')
            );

            await service.handleFileCreateOrChange(uri);

            // Now update with new content
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(validFileContent, 'utf8')
            );

            await service.handleFileCreateOrChange(uri);

            // Check that file was updated
            const entry = memoryIndex.get(uri.fsPath);
            expect(entry?.frontmatter.title).toBe('Test Memory');
            expect(entry?.frontmatter.tags).toEqual(['backend.database', 'testing']);

            // Check that old tags were removed and new tags added
            expect(tagSystem.queryByTag('old.tag')).not.toContain(uri.fsPath);
            expect(tagSystem.queryByTag('backend.database')).toContain(uri.fsPath);
            expect(tagSystem.queryByTag('testing')).toContain(uri.fsPath);
        });

        it('should handle files with malformed frontmatter gracefully', async () => {
            const uri = vscode.Uri.file('/test/invalid.md');

            const invalidContent = `---
title: "No tags here"
---

Content.`;

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(invalidContent, 'utf8')
            );

            // Should not throw
            await expect(service.handleFileCreateOrChange(uri)).resolves.not.toThrow();

            // File should not be added to index
            expect(memoryIndex.has(uri.fsPath)).toBe(false);
        });

        it('should handle file read errors gracefully', async () => {
            const uri = vscode.Uri.file('/test/unreadable.md');

            (vscode.workspace.fs.readFile as jest.Mock).mockRejectedValue(
                // @ts-ignore - Mock return type
                new Error('File not found')
            );

            // Should not throw
            await expect(service.handleFileCreateOrChange(uri)).resolves.not.toThrow();

            // File should not be added to index
            expect(memoryIndex.has(uri.fsPath)).toBe(false);
        });
    });

    describe('handleFileDelete', () => {
        it('should remove file from index and tag system', async () => {
            const uri = vscode.Uri.file('/test/file.md');

            // First add a file
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(validFileContent, 'utf8')
            );

            await service.handleFileCreateOrChange(uri);

            // Verify it was added
            expect(memoryIndex.has(uri.fsPath)).toBe(true);
            expect(tagSystem.queryByTag('backend.database')).toContain(uri.fsPath);

            // Now delete it
            service.handleFileDelete(uri);

            // Verify it was removed
            expect(memoryIndex.has(uri.fsPath)).toBe(false);
            expect(tagSystem.queryByTag('backend.database')).not.toContain(uri.fsPath);
            expect(tagSystem.queryByTag('testing')).not.toContain(uri.fsPath);
        });

        it('should handle deletion of non-existent file gracefully', () => {
            const uri = vscode.Uri.file('/test/nonexistent.md');

            // Should not throw
            expect(() => service.handleFileDelete(uri)).not.toThrow();
        });
    });

    describe('synchronizeBatch', () => {
        it('should synchronize multiple files', async () => {
            const uri1 = vscode.Uri.file('/test/file1.md');
            const uri2 = vscode.Uri.file('/test/file2.md');

            const content1 = `---
title: "File 1"
tags:
  - "tag1"
---

Content 1.`;

            const content2 = `---
title: "File 2"
tags:
  - "tag2"
---

Content 2.`;

            (vscode.workspace.fs.readFile as jest.Mock)
                // @ts-ignore - Mock return type
                .mockResolvedValueOnce(Buffer.from(content1, 'utf8'))
                // @ts-ignore - Mock return type
                .mockResolvedValueOnce(Buffer.from(content2, 'utf8'));

            await service.synchronizeBatch([uri1, uri2]);

            // Check both files were added
            expect(memoryIndex.has(uri1.fsPath)).toBe(true);
            expect(memoryIndex.has(uri2.fsPath)).toBe(true);

            // Check tags
            expect(tagSystem.queryByTag('tag1')).toContain(uri1.fsPath);
            expect(tagSystem.queryByTag('tag2')).toContain(uri2.fsPath);
        });

        it('should continue processing even if one file fails', async () => {
            const uri1 = vscode.Uri.file('/test/file1.md');
            const uri2 = vscode.Uri.file('/test/file2.md');
            const uri3 = vscode.Uri.file('/test/file3.md');

            const validContent = `---
title: "Valid File"
tags:
  - "tag1"
---

Content.`;

            (vscode.workspace.fs.readFile as jest.Mock)
                // @ts-ignore - Mock return type
                .mockResolvedValueOnce(Buffer.from(validContent, 'utf8'))
                // @ts-ignore - Mock return type
                .mockRejectedValueOnce(new Error('Read failed'))
                // @ts-ignore - Mock return type
                .mockResolvedValueOnce(Buffer.from(validContent, 'utf8'));

            // Should not throw
            await expect(service.synchronizeBatch([uri1, uri2, uri3])).resolves.not.toThrow();

            // Check that valid files were processed
            expect(memoryIndex.has(uri1.fsPath)).toBe(true);
            expect(memoryIndex.has(uri2.fsPath)).toBe(false);
            expect(memoryIndex.has(uri3.fsPath)).toBe(true);
        });
    });

    describe('clear', () => {
        it('should clear all synchronized data', async () => {
            const uri = vscode.Uri.file('/test/file.md');

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(validFileContent, 'utf8')
            );

            await service.handleFileCreateOrChange(uri);

            // Verify data exists
            expect(memoryIndex.size()).toBeGreaterThan(0);
            expect(tagSystem.size()).toBeGreaterThan(0);

            // Clear
            service.clear();

            // Verify everything is cleared
            expect(memoryIndex.size()).toBe(0);
            expect(tagSystem.size()).toBe(0);
        });
    });
});
