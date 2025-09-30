import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MemorySynchronizationService } from '../../src/core/MemorySynchronizationService';
import { MemoryIndex } from '../../src/core/MemoryIndex';
import { TagSystem } from '../../src/core/TagSystem';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode');

describe('Silent Recovery Integration', () => {
    let service: MemorySynchronizationService;
    let memoryIndex: MemoryIndex;
    let tagSystem: TagSystem;

    beforeEach(() => {
        memoryIndex = new MemoryIndex();
        tagSystem = new TagSystem();
        service = new MemorySynchronizationService(memoryIndex, tagSystem);

        jest.clearAllMocks();
    });

    it('should automatically recover when invalid file becomes valid', async () => {
        const filePath = '/test/file.md';

        // Step 1: File starts with invalid frontmatter (missing tags)
        const invalidContent = `---
title: "Test Memory"
---

Content.`;

        (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
            // @ts-ignore - Mock return type
            Buffer.from(invalidContent, 'utf8')
        );

        // Try to refresh the invalid file
        await service.refreshFile(filePath);

        // File should not be in index
        expect(memoryIndex.has(filePath)).toBe(false);
        expect(tagSystem.queryByTag('test.tag')).not.toContain(filePath);

        // Step 2: File is corrected with valid frontmatter
        const validContent = `---
title: "Test Memory"
tags:
  - "test.tag"
  - "backend.database"
---

Content.`;

        (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
            // @ts-ignore - Mock return type
            Buffer.from(validContent, 'utf8')
        );

        // Refresh the now-valid file (simulating file watcher detecting change)
        await service.refreshFile(filePath);

        // File should now be in index - SILENT RECOVERY!
        expect(memoryIndex.has(filePath)).toBe(true);
        expect(tagSystem.queryByTag('test.tag')).toContain(filePath);
        expect(tagSystem.queryByTag('backend.database')).toContain(filePath);

        const entry = memoryIndex.get(filePath);
        expect(entry?.frontmatter.title).toBe('Test Memory');
    });

    it('should handle file that goes from valid to invalid to valid', async () => {
        const filePath = '/test/file.md';

        // Step 1: File starts valid
        const validContent1 = `---
title: "Version 1"
tags:
  - "tag1"
---

Content 1.`;

        (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
            // @ts-ignore - Mock return type
            Buffer.from(validContent1, 'utf8')
        );

        await service.refreshFile(filePath);
        expect(memoryIndex.has(filePath)).toBe(true);
        expect(tagSystem.queryByTag('tag1')).toContain(filePath);

        // Step 2: File becomes invalid
        const invalidContent = `---
title: "Version 2 - Invalid"
---

Content 2.`;

        (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
            // @ts-ignore - Mock return type
            Buffer.from(invalidContent, 'utf8')
        );

        await service.refreshFile(filePath);

        // File should be removed from index
        expect(memoryIndex.has(filePath)).toBe(false);
        expect(tagSystem.queryByTag('tag1')).not.toContain(filePath);

        // Step 3: File is fixed with valid content again
        const validContent2 = `---
title: "Version 3 - Fixed"
tags:
  - "tag2"
  - "tag3"
---

Content 3.`;

        (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
            // @ts-ignore - Mock return type
            Buffer.from(validContent2, 'utf8')
        );

        await service.refreshFile(filePath);

        // File should be back in index with new data - SILENT RECOVERY!
        expect(memoryIndex.has(filePath)).toBe(true);
        expect(tagSystem.queryByTag('tag2')).toContain(filePath);
        expect(tagSystem.queryByTag('tag3')).toContain(filePath);

        // Old tags should not be present
        expect(tagSystem.queryByTag('tag1')).not.toContain(filePath);

        const entry = memoryIndex.get(filePath);
        expect(entry?.frontmatter.title).toBe('Version 3 - Fixed');
    });

    it('should handle multiple files with different states', async () => {
        const file1 = '/test/file1.md';
        const file2 = '/test/file2.md';

        // File 1: Valid
        const validContent = `---
title: "File 1"
tags:
  - "tag1"
---

Content.`;

        // File 2: Invalid
        const invalidContent = `---
title: "File 2"
---

Content.`;

        (vscode.workspace.fs.readFile as jest.Mock)
            // @ts-ignore - Mock return type
            .mockResolvedValueOnce(Buffer.from(validContent, 'utf8'))
            // @ts-ignore - Mock return type
            .mockResolvedValueOnce(Buffer.from(invalidContent, 'utf8'));

        await service.refreshFile(file1);
        await service.refreshFile(file2);

        // File 1 should be indexed, File 2 should not
        expect(memoryIndex.has(file1)).toBe(true);
        expect(memoryIndex.has(file2)).toBe(false);

        // Now fix File 2
        const fixedContent = `---
title: "File 2 Fixed"
tags:
  - "tag2"
---

Content.`;

        (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
            // @ts-ignore - Mock return type
            Buffer.from(fixedContent, 'utf8')
        );

        await service.refreshFile(file2);

        // Both files should now be indexed
        expect(memoryIndex.has(file1)).toBe(true);
        expect(memoryIndex.has(file2)).toBe(true);
        expect(memoryIndex.size()).toBe(2);
    });

    it('should maintain consistency across multiple recovery cycles', async () => {
        const filePath = '/test/file.md';

        // Cycle through valid -> invalid -> valid multiple times
        for (let i = 0; i < 3; i++) {
            // Make valid
            const validContent = `---
title: "Cycle ${i}"
tags:
  - "cycle${i}"
---

Content ${i}.`;

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(validContent, 'utf8')
            );

            await service.refreshFile(filePath);
            expect(memoryIndex.has(filePath)).toBe(true);

            // Make invalid
            const invalidContent = `---
title: "Invalid ${i}"
---

Content.`;

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                // @ts-ignore - Mock return type
                Buffer.from(invalidContent, 'utf8')
            );

            await service.refreshFile(filePath);
            expect(memoryIndex.has(filePath)).toBe(false);
        }

        // Final recovery
        const finalValid = `---
title: "Final Version"
tags:
  - "final"
---

Final content.`;

        (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
            // @ts-ignore - Mock return type
            Buffer.from(finalValid, 'utf8')
        );

        await service.refreshFile(filePath);

        expect(memoryIndex.has(filePath)).toBe(true);
        expect(tagSystem.queryByTag('final')).toContain(filePath);

        // Only the latest tags should exist
        expect(tagSystem.queryByTag('cycle0')).not.toContain(filePath);
        expect(tagSystem.queryByTag('cycle1')).not.toContain(filePath);
        expect(tagSystem.queryByTag('cycle2')).not.toContain(filePath);
    });
});
