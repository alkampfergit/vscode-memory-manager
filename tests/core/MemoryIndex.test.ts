import { describe, it, expect, beforeEach } from '@jest/globals';
import { MemoryIndex } from '../../src/core/MemoryIndex';
import { MemoryFileFrontmatter } from '../../src/core/MemoryFileParser';

describe('MemoryIndex', () => {
    let index: MemoryIndex;

    const mockFrontmatter: MemoryFileFrontmatter = {
        title: 'Test Memory',
        tags: ['tag1', 'tag2']
    };

    const mockContent = '# Test Content\n\nThis is a test.';

    beforeEach(() => {
        index = new MemoryIndex();
    });

    describe('add', () => {
        it('should add a new entry to the index', () => {
            index.add('/path/to/file.md', mockFrontmatter, mockContent);

            expect(index.has('/path/to/file.md')).toBe(true);
            expect(index.size()).toBe(1);
        });

        it('should overwrite existing entry when adding with same path', () => {
            index.add('/path/to/file.md', mockFrontmatter, mockContent);

            const updatedFrontmatter: MemoryFileFrontmatter = {
                title: 'Updated Memory',
                tags: ['tag3']
            };

            index.add('/path/to/file.md', updatedFrontmatter, 'New content');

            const entry = index.get('/path/to/file.md');
            expect(entry?.frontmatter.title).toBe('Updated Memory');
            expect(entry?.content).toBe('New content');
            expect(index.size()).toBe(1);
        });

        it('should set lastModified date', () => {
            const before = new Date();
            index.add('/path/to/file.md', mockFrontmatter, mockContent);
            const after = new Date();

            const entry = index.get('/path/to/file.md');
            expect(entry?.lastModified.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(entry?.lastModified.getTime()).toBeLessThanOrEqual(after.getTime());
        });
    });

    describe('get', () => {
        it('should retrieve an entry by file path', () => {
            index.add('/path/to/file.md', mockFrontmatter, mockContent);

            const entry = index.get('/path/to/file.md');

            expect(entry).toBeDefined();
            expect(entry?.filePath).toBe('/path/to/file.md');
            expect(entry?.frontmatter).toEqual(mockFrontmatter);
            expect(entry?.content).toBe(mockContent);
        });

        it('should return undefined for non-existent path', () => {
            const entry = index.get('/non/existent/path.md');
            expect(entry).toBeUndefined();
        });
    });

    describe('update', () => {
        it('should update an existing entry', () => {
            index.add('/path/to/file.md', mockFrontmatter, mockContent);

            const updatedFrontmatter: MemoryFileFrontmatter = {
                title: 'Updated Memory',
                tags: ['tag3']
            };

            const result = index.update('/path/to/file.md', updatedFrontmatter, 'Updated content');

            expect(result).toBe(true);

            const entry = index.get('/path/to/file.md');
            expect(entry?.frontmatter.title).toBe('Updated Memory');
            expect(entry?.content).toBe('Updated content');
        });

        it('should return false when updating non-existent entry', () => {
            const result = index.update('/non/existent/path.md', mockFrontmatter, mockContent);
            expect(result).toBe(false);
        });
    });

    describe('remove', () => {
        it('should remove an entry from the index', () => {
            index.add('/path/to/file.md', mockFrontmatter, mockContent);

            const result = index.remove('/path/to/file.md');

            expect(result).toBe(true);
            expect(index.has('/path/to/file.md')).toBe(false);
            expect(index.size()).toBe(0);
        });

        it('should return false when removing non-existent entry', () => {
            const result = index.remove('/non/existent/path.md');
            expect(result).toBe(false);
        });
    });

    describe('has', () => {
        it('should return true for existing entry', () => {
            index.add('/path/to/file.md', mockFrontmatter, mockContent);
            expect(index.has('/path/to/file.md')).toBe(true);
        });

        it('should return false for non-existent entry', () => {
            expect(index.has('/non/existent/path.md')).toBe(false);
        });
    });

    describe('getAll', () => {
        it('should return all entries', () => {
            index.add('/path/to/file1.md', mockFrontmatter, mockContent);
            index.add('/path/to/file2.md', mockFrontmatter, mockContent);
            index.add('/path/to/file3.md', mockFrontmatter, mockContent);

            const allEntries = index.getAll();

            expect(allEntries).toHaveLength(3);
            expect(allEntries.map(e => e.filePath)).toEqual([
                '/path/to/file1.md',
                '/path/to/file2.md',
                '/path/to/file3.md'
            ]);
        });

        it('should return empty array when index is empty', () => {
            const allEntries = index.getAll();
            expect(allEntries).toEqual([]);
        });
    });

    describe('getFilePaths', () => {
        it('should return all file paths', () => {
            index.add('/path/to/file1.md', mockFrontmatter, mockContent);
            index.add('/path/to/file2.md', mockFrontmatter, mockContent);

            const filePaths = index.getFilePaths();

            expect(filePaths).toHaveLength(2);
            expect(filePaths).toContain('/path/to/file1.md');
            expect(filePaths).toContain('/path/to/file2.md');
        });

        it('should return empty array when index is empty', () => {
            const filePaths = index.getFilePaths();
            expect(filePaths).toEqual([]);
        });
    });

    describe('clear', () => {
        it('should remove all entries', () => {
            index.add('/path/to/file1.md', mockFrontmatter, mockContent);
            index.add('/path/to/file2.md', mockFrontmatter, mockContent);

            index.clear();

            expect(index.size()).toBe(0);
            expect(index.getAll()).toEqual([]);
        });
    });

    describe('size', () => {
        it('should return the number of entries', () => {
            expect(index.size()).toBe(0);

            index.add('/path/to/file1.md', mockFrontmatter, mockContent);
            expect(index.size()).toBe(1);

            index.add('/path/to/file2.md', mockFrontmatter, mockContent);
            expect(index.size()).toBe(2);

            index.remove('/path/to/file1.md');
            expect(index.size()).toBe(1);
        });
    });
});
