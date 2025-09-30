import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MemoryManagerService } from '../../src/core/MemoryManagerService';
import { FileWatcherSystem } from '../../src/core/FileWatcherSystem';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode');

describe('File Watcher Integration Tests', () => {
    let memoryManager: MemoryManagerService;
    let mockWatcher: any;

    const validFileContent = `---
title: "Test Memory"
tags:
  - "backend.database"
  - "testing"
---

# Test Content

This is test content.`;

    beforeEach(() => {
        memoryManager = new MemoryManagerService();
        jest.clearAllMocks();

        // Start the memory manager
        memoryManager.start('**/Memory/**/*.md');

        // Get the mock watcher
        mockWatcher = (vscode.workspace.createFileSystemWatcher as jest.Mock).mock.results[0].value;
    });

    afterEach(() => {
        memoryManager.dispose();
    });

    describe('File Creation Events', () => {
        it('should add new valid memory file to index when created', async () => {
            const uri = vscode.Uri.file('/Memory/test.md');

            // Mock file read
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(validFileContent, 'utf8')
            );

            // Simulate file creation
            mockWatcher._triggerCreate(uri);

            // Wait for async processing
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify file was added to index
            const memoryIndex = memoryManager.getMemoryIndex();
            expect(memoryIndex.has(uri.fsPath)).toBe(true);

            const entry = memoryIndex.get(uri.fsPath);
            expect(entry?.frontmatter.title).toBe('Test Memory');
            expect(entry?.frontmatter.tags).toEqual(['backend.database', 'testing']);

            // Verify tags were added
            const tagSystem = memoryManager.getTagSystem();
            expect(tagSystem.queryByTag('backend.database')).toContain(uri.fsPath);
            expect(tagSystem.queryByTag('testing')).toContain(uri.fsPath);
        });

        it('should not add invalid memory file to index when created', async () => {
            const uri = vscode.Uri.file('/Memory/invalid.md');

            const invalidContent = `---
title: "Invalid File"
---

No tags field.`;

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(invalidContent, 'utf8')
            );

            // Simulate file creation
            mockWatcher._triggerCreate(uri);

            // Wait for async processing
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify file was NOT added to index
            const memoryIndex = memoryManager.getMemoryIndex();
            expect(memoryIndex.has(uri.fsPath)).toBe(false);
        });
    });

    describe('File Update Events', () => {
        it('should update existing memory file in index when changed', async () => {
            const uri = vscode.Uri.file('/Memory/test.md');

            // First create the file
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(validFileContent, 'utf8')
            );

            mockWatcher._triggerCreate(uri);
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify initial state
            const memoryIndex = memoryManager.getMemoryIndex();
            expect(memoryIndex.get(uri.fsPath)?.frontmatter.title).toBe('Test Memory');

            // Now update the file
            const updatedContent = `---
title: "Updated Test Memory"
tags:
  - "backend.database"
  - "testing"
  - "updated"
---

# Updated Content`;

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(updatedContent, 'utf8')
            );

            // Simulate file change
            mockWatcher._triggerChange(uri);
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify file was updated
            const entry = memoryIndex.get(uri.fsPath);
            expect(entry?.frontmatter.title).toBe('Updated Test Memory');
            expect(entry?.frontmatter.tags).toContain('updated');

            // Verify new tag was added
            const tagSystem = memoryManager.getTagSystem();
            expect(tagSystem.queryByTag('updated')).toContain(uri.fsPath);
        });

        it('should handle file becoming invalid on update', async () => {
            const uri = vscode.Uri.file('/Memory/test.md');

            // First create valid file
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(validFileContent, 'utf8')
            );

            mockWatcher._triggerCreate(uri);
            await new Promise(resolve => setTimeout(resolve, 10));

            const memoryIndex = memoryManager.getMemoryIndex();
            expect(memoryIndex.has(uri.fsPath)).toBe(true);

            // Update to invalid content
            const invalidContent = `---
title: "Now Invalid"
---

Missing tags.`;

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(invalidContent, 'utf8')
            );

            // Simulate file change
            mockWatcher._triggerChange(uri);
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify file was removed from index (silent recovery behavior)
            expect(memoryIndex.has(uri.fsPath)).toBe(false);

            // Verify tags were removed
            const tagSystem = memoryManager.getTagSystem();
            expect(tagSystem.queryByTag('backend.database')).not.toContain(uri.fsPath);
        });
    });

    describe('File Deletion Events', () => {
        it('should remove memory file from index when deleted', async () => {
            const uri = vscode.Uri.file('/Memory/test.md');

            // First create the file
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(validFileContent, 'utf8')
            );

            mockWatcher._triggerCreate(uri);
            await new Promise(resolve => setTimeout(resolve, 10));

            const memoryIndex = memoryManager.getMemoryIndex();
            const tagSystem = memoryManager.getTagSystem();

            // Verify file exists
            expect(memoryIndex.has(uri.fsPath)).toBe(true);
            expect(tagSystem.queryByTag('backend.database')).toContain(uri.fsPath);

            // Simulate file deletion
            mockWatcher._triggerDelete(uri);
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify file was removed
            expect(memoryIndex.has(uri.fsPath)).toBe(false);
            expect(tagSystem.queryByTag('backend.database')).not.toContain(uri.fsPath);
            expect(tagSystem.queryByTag('testing')).not.toContain(uri.fsPath);
        });

        it('should handle deletion of non-existent file gracefully', async () => {
            const uri = vscode.Uri.file('/Memory/nonexistent.md');

            // Simulate deletion of file that was never added
            expect(() => {
                mockWatcher._triggerDelete(uri);
            }).not.toThrow();
        });
    });

    describe('Silent Recovery Integration', () => {
        it('should automatically recover when invalid file is corrected', async () => {
            const uri = vscode.Uri.file('/Memory/test.md');

            // Step 1: Create invalid file
            const invalidContent = `---
title: "Invalid File"
---

Missing tags.`;

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(invalidContent, 'utf8')
            );

            mockWatcher._triggerCreate(uri);
            await new Promise(resolve => setTimeout(resolve, 10));

            const memoryIndex = memoryManager.getMemoryIndex();
            expect(memoryIndex.has(uri.fsPath)).toBe(false);

            // Step 2: Correct the file
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(validFileContent, 'utf8')
            );

            // Simulate file change (user fixed the file)
            mockWatcher._triggerChange(uri);
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify file was automatically added to index (SILENT RECOVERY)
            expect(memoryIndex.has(uri.fsPath)).toBe(true);

            const entry = memoryIndex.get(uri.fsPath);
            expect(entry?.frontmatter.title).toBe('Test Memory');

            const tagSystem = memoryManager.getTagSystem();
            expect(tagSystem.queryByTag('backend.database')).toContain(uri.fsPath);
        });

        it('should handle multiple correction attempts', async () => {
            const uri = vscode.Uri.file('/Memory/test.md');
            const memoryIndex = memoryManager.getMemoryIndex();

            // Attempt 1: Invalid
            const invalid1 = `---
title: "Attempt 1"
---
Content.`;

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(invalid1, 'utf8')
            );

            mockWatcher._triggerCreate(uri);
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(memoryIndex.has(uri.fsPath)).toBe(false);

            // Attempt 2: Still invalid
            const invalid2 = `---
title: "Attempt 2"
tags: "not-an-array"
---
Content.`;

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(invalid2, 'utf8')
            );

            mockWatcher._triggerChange(uri);
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(memoryIndex.has(uri.fsPath)).toBe(false);

            // Attempt 3: Finally valid
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(validFileContent, 'utf8')
            );

            mockWatcher._triggerChange(uri);
            await new Promise(resolve => setTimeout(resolve, 10));

            // Success!
            expect(memoryIndex.has(uri.fsPath)).toBe(true);
        });
    });

    describe('Multiple File Operations', () => {
        it('should handle multiple files being created simultaneously', async () => {
            const file1 = vscode.Uri.file('/Memory/file1.md');
            const file2 = vscode.Uri.file('/Memory/file2.md');
            const file3 = vscode.Uri.file('/Memory/file3.md');

            const content1 = `---
title: "File 1"
tags: ["tag1"]
---
Content 1.`;

            const content2 = `---
title: "File 2"
tags: ["tag2"]
---
Content 2.`;

            const content3 = `---
title: "File 3"
tags: ["tag3"]
---
Content 3.`;

            (vscode.workspace.fs.readFile as jest.Mock)
                // @ts-ignore - Mock return type
                .mockResolvedValueOnce(Buffer.from(content1, 'utf8'))
                // @ts-ignore - Mock return type
                .mockResolvedValueOnce(Buffer.from(content2, 'utf8'))
                // @ts-ignore - Mock return type
                .mockResolvedValueOnce(Buffer.from(content3, 'utf8'));

            // Trigger all creates
            mockWatcher._triggerCreate(file1);
            mockWatcher._triggerCreate(file2);
            mockWatcher._triggerCreate(file3);

            await new Promise(resolve => setTimeout(resolve, 20));

            const memoryIndex = memoryManager.getMemoryIndex();
            expect(memoryIndex.size()).toBe(3);
            expect(memoryIndex.has(file1.fsPath)).toBe(true);
            expect(memoryIndex.has(file2.fsPath)).toBe(true);
            expect(memoryIndex.has(file3.fsPath)).toBe(true);
        });

        it('should handle mixed operations on multiple files', async () => {
            const file1 = vscode.Uri.file('/Memory/file1.md');
            const file2 = vscode.Uri.file('/Memory/file2.md');

            // Create file1
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(validFileContent, 'utf8')
            );

            mockWatcher._triggerCreate(file1);
            await new Promise(resolve => setTimeout(resolve, 10));

            // Create file2
            mockWatcher._triggerCreate(file2);
            await new Promise(resolve => setTimeout(resolve, 10));

            const memoryIndex = memoryManager.getMemoryIndex();
            expect(memoryIndex.size()).toBe(2);

            // Delete file1
            mockWatcher._triggerDelete(file1);
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(memoryIndex.size()).toBe(1);
            expect(memoryIndex.has(file1.fsPath)).toBe(false);
            expect(memoryIndex.has(file2.fsPath)).toBe(true);

            // Update file2
            const updatedContent = `---
title: "Updated File 2"
tags: ["new-tag"]
---
Updated.`;

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(updatedContent, 'utf8')
            );

            mockWatcher._triggerChange(file2);
            await new Promise(resolve => setTimeout(resolve, 10));

            const entry = memoryIndex.get(file2.fsPath);
            expect(entry?.frontmatter.title).toBe('Updated File 2');

            const tagSystem = memoryManager.getTagSystem();
            expect(tagSystem.queryByTag('new-tag')).toContain(file2.fsPath);
        });
    });
});
