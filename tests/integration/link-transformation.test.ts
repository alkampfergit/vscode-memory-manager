import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ContentInjectionEngine } from '../../src/chat/ContentInjectionEngine';
import { MemoryIndex } from '../../src/core/MemoryIndex';
import { TagSystem } from '../../src/core/TagSystem';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Link Transformation Integration Tests', () => {
    let contentInjector: ContentInjectionEngine;
    let memoryIndex: MemoryIndex;
    let tagSystem: TagSystem;
    let tempDir: string;

    beforeEach(async () => {
        memoryIndex = new MemoryIndex();
        tagSystem = new TagSystem();
        contentInjector = new ContentInjectionEngine(memoryIndex, tagSystem);

        // Create a temporary directory for test files
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'link-transformation-test-'));
    });

    afterEach(async () => {
        // Clean up temporary directory
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    describe('End-to-end content transformation', () => {
        it('should replace links with text and append linked content', async () => {
            // Create a linked file
            const linkedFile = path.join(tempDir, 'linked.md');
            await fs.promises.writeFile(linkedFile, 'This is the linked file content.');

            // Create a base memory file with a link
            const baseFile = path.join(tempDir, 'base.md');
            const baseContent = `---
title: "Base Memory"
tags:
  - "test.base"
---

# Base Content

For more information, see [the guide](./linked.md).

This is additional content.`;

            await fs.promises.writeFile(baseFile, baseContent);

            // Process the file
            const results = await contentInjector.getMemoryContents([baseFile]);

            expect(results).toHaveLength(1);
            expect(results[0].title).toBe('Base Memory');

            // Check that the link was replaced with text
            expect(results[0].content).toContain('see the guide.');
            expect(results[0].content).not.toContain('[the guide](./linked.md)');

            // Check that linked content was appended
            expect(results[0].content).toContain('Linked Content from: ./linked.md');
            expect(results[0].content).toContain('This is the linked file content.');
        });

        it('should handle multiple links in one file', async () => {
            // Create linked files
            const linked1 = path.join(tempDir, 'guide1.md');
            const linked2 = path.join(tempDir, 'guide2.md');
            await fs.promises.writeFile(linked1, 'Guide 1 content.');
            await fs.promises.writeFile(linked2, 'Guide 2 content.');

            // Create base file with multiple links
            const baseFile = path.join(tempDir, 'base.md');
            const baseContent = `---
title: "Base"
tags:
  - "test"
---

See [guide 1](./guide1.md) and [guide 2](./guide2.md).`;

            await fs.promises.writeFile(baseFile, baseContent);

            const results = await contentInjector.getMemoryContents([baseFile]);

            expect(results).toHaveLength(1);

            // Both links should be replaced
            expect(results[0].content).toContain('See guide 1 and guide 2.');

            // Both linked contents should be appended
            expect(results[0].content).toContain('Guide 1 content.');
            expect(results[0].content).toContain('Guide 2 content.');
        });

        it('should handle files with no links', async () => {
            const baseFile = path.join(tempDir, 'no-links.md');
            const baseContent = `---
title: "No Links"
tags:
  - "test"
---

This content has no links.`;

            await fs.promises.writeFile(baseFile, baseContent);

            const results = await contentInjector.getMemoryContents([baseFile]);

            expect(results).toHaveLength(1);
            expect(results[0].content).toBe('This content has no links.');
        });

        it('should handle broken links gracefully', async () => {
            const baseFile = path.join(tempDir, 'broken-link.md');
            const baseContent = `---
title: "Broken Link"
tags:
  - "test"
---

See [missing file](./missing.md) for more info.`;

            await fs.promises.writeFile(baseFile, baseContent);

            const results = await contentInjector.getMemoryContents([baseFile]);

            expect(results).toHaveLength(1);

            // Link should still be replaced with text
            expect(results[0].content).toContain('See missing file for more info.');

            // No linked content should be appended for broken links
            expect(results[0].content).not.toContain('Linked Content from: ./missing.md');
        });

        it('should handle relative paths in subdirectories', async () => {
            // Create subdirectory structure
            const subDir = path.join(tempDir, 'subfolder');
            await fs.promises.mkdir(subDir);

            const linkedFile = path.join(subDir, 'linked.md');
            await fs.promises.writeFile(linkedFile, 'Linked in subfolder.');

            const baseFile = path.join(subDir, 'base.md');
            const baseContent = `---
title: "Base in Subfolder"
tags:
  - "test"
---

See [local file](./linked.md).`;

            await fs.promises.writeFile(baseFile, baseContent);

            const results = await contentInjector.getMemoryContents([baseFile]);

            expect(results).toHaveLength(1);
            expect(results[0].content).toContain('See local file.');
            expect(results[0].content).toContain('Linked in subfolder.');
        });

        it('should handle parent directory references', async () => {
            // Create subdirectory
            const subDir = path.join(tempDir, 'subfolder');
            await fs.promises.mkdir(subDir);

            // Create file in parent (tempDir)
            const parentFile = path.join(tempDir, 'parent.md');
            await fs.promises.writeFile(parentFile, 'Parent file content.');

            // Create base file in subdirectory with link to parent
            const baseFile = path.join(subDir, 'base.md');
            const baseContent = `---
title: "Base"
tags:
  - "test"
---

See [parent file](../parent.md).`;

            await fs.promises.writeFile(baseFile, baseContent);

            const results = await contentInjector.getMemoryContents([baseFile]);

            expect(results).toHaveLength(1);
            expect(results[0].content).toContain('See parent file.');
            expect(results[0].content).toContain('Parent file content.');
        });

        it('should not recursively resolve links', async () => {
            // Create a chain of linked files
            const file3 = path.join(tempDir, 'file3.md');
            await fs.promises.writeFile(file3, 'Final content.');

            const file2 = path.join(tempDir, 'file2.md');
            await fs.promises.writeFile(file2, 'Content with [link to file3](./file3.md).');

            const file1 = path.join(tempDir, 'file1.md');
            const baseContent = `---
title: "File 1"
tags:
  - "test"
---

Content with [link to file2](./file2.md).`;

            await fs.promises.writeFile(file1, baseContent);

            const results = await contentInjector.getMemoryContents([file1]);

            expect(results).toHaveLength(1);

            // Should include file2's content
            expect(results[0].content).toContain('Content with [link to file3](./file3.md).');

            // Should NOT include file3's content (no recursive resolution)
            expect(results[0].content).not.toContain('Final content.');
        });

        it('should handle URLs by not resolving them', async () => {
            const baseFile = path.join(tempDir, 'with-url.md');
            const baseContent = `---
title: "With URL"
tags:
  - "test"
---

See [website](https://example.com) for more.`;

            await fs.promises.writeFile(baseFile, baseContent);

            const results = await contentInjector.getMemoryContents([baseFile]);

            expect(results).toHaveLength(1);

            // URL link should be replaced with text
            expect(results[0].content).toContain('See website for more.');

            // URL content should not be appended
            expect(results[0].content).not.toContain('https://example.com');
        });

        it('should preserve content structure when replacing links', async () => {
            const linkedFile = path.join(tempDir, 'linked.md');
            await fs.promises.writeFile(linkedFile, 'Linked content.');

            const baseFile = path.join(tempDir, 'base.md');
            const baseContent = `---
title: "Base"
tags:
  - "test"
---

# Heading 1

First paragraph with [a link](./linked.md) in it.

## Heading 2

Second paragraph.`;

            await fs.promises.writeFile(baseFile, baseContent);

            const results = await contentInjector.getMemoryContents([baseFile]);

            expect(results).toHaveLength(1);

            // Structure should be preserved
            expect(results[0].content).toContain('# Heading 1');
            expect(results[0].content).toContain('First paragraph with a link in it.');
            expect(results[0].content).toContain('## Heading 2');
            expect(results[0].content).toContain('Second paragraph.');
        });
    });

    describe('Multiple files processing', () => {
        it('should process multiple memory files independently', async () => {
            // Create shared linked file
            const sharedLinked = path.join(tempDir, 'shared.md');
            await fs.promises.writeFile(sharedLinked, 'Shared content.');

            // Create two base files that link to the same file
            const base1 = path.join(tempDir, 'base1.md');
            const base1Content = `---
title: "Base 1"
tags:
  - "test"
---

From base1: [shared](./shared.md).`;

            const base2 = path.join(tempDir, 'base2.md');
            const base2Content = `---
title: "Base 2"
tags:
  - "test"
---

From base2: [shared](./shared.md).`;

            await fs.promises.writeFile(base1, base1Content);
            await fs.promises.writeFile(base2, base2Content);

            const results = await contentInjector.getMemoryContents([base1, base2]);

            expect(results).toHaveLength(2);

            // Both should have processed their links independently
            expect(results[0].content).toContain('From base1: shared.');
            expect(results[0].content).toContain('Shared content.');

            expect(results[1].content).toContain('From base2: shared.');
            expect(results[1].content).toContain('Shared content.');
        });
    });
});
