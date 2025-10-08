import { describe, it, expect, beforeEach } from '@jest/globals';
import { TagSystem } from '../../src/core/TagSystem';

describe('TagSystem', () => {
    let tagSystem: TagSystem;

    beforeEach(() => {
        tagSystem = new TagSystem();
    });

    describe('addTags', () => {
        it('should add tags for a file', () => {
            tagSystem.addTags('/file1.md', ['backend.database.postgres']);

            const files = tagSystem.queryByTag('backend.database.postgres');
            expect(files).toEqual(['/file1.md']);
        });

        it('should add multiple tags for a file', () => {
            tagSystem.addTags('/file1.md', [
                'backend.database.postgres',
                'backend.connection-pool',
                'performance'
            ]);

            expect(tagSystem.queryByTag('backend.database.postgres')).toEqual(['/file1.md']);
            expect(tagSystem.queryByTag('backend.connection-pool')).toEqual(['/file1.md']);
            expect(tagSystem.queryByTag('performance')).toEqual(['/file1.md']);
        });

        it('should handle hierarchical tags correctly', () => {
            tagSystem.addTags('/file1.md', ['backend.database.postgres']);

            expect(tagSystem.queryByTag('backend')).toEqual(['/file1.md']);
            expect(tagSystem.queryByTag('backend.database')).toEqual(['/file1.md']);
            expect(tagSystem.queryByTag('backend.database.postgres')).toEqual(['/file1.md']);
        });

        it('should add same tag for multiple files', () => {
            tagSystem.addTags('/file1.md', ['backend.database']);
            tagSystem.addTags('/file2.md', ['backend.database']);
            tagSystem.addTags('/file3.md', ['backend.database']);

            const files = tagSystem.queryByTag('backend.database');
            expect(files).toHaveLength(3);
            expect(files).toContain('/file1.md');
            expect(files).toContain('/file2.md');
            expect(files).toContain('/file3.md');
        });
    });

    describe('removeTags', () => {
        it('should remove tags for a file', () => {
            tagSystem.addTags('/file1.md', ['backend.database.postgres']);
            tagSystem.removeTags('/file1.md', ['backend.database.postgres']);

            expect(tagSystem.queryByTag('backend.database.postgres')).toEqual([]);
            expect(tagSystem.queryByTag('backend.database')).toEqual([]);
            expect(tagSystem.queryByTag('backend')).toEqual([]);
        });

        it('should only remove tags for specified file', () => {
            tagSystem.addTags('/file1.md', ['backend.database']);
            tagSystem.addTags('/file2.md', ['backend.database']);

            tagSystem.removeTags('/file1.md', ['backend.database']);

            expect(tagSystem.queryByTag('backend.database')).toEqual(['/file2.md']);
        });

        it('should handle removing non-existent tags gracefully', () => {
            expect(() => {
                tagSystem.removeTags('/file1.md', ['non.existent.tag']);
            }).not.toThrow();
        });
    });

    describe('queryByTag', () => {
        it('should return files with exact tag match', () => {
            tagSystem.addTags('/file1.md', ['backend.database.postgres']);
            tagSystem.addTags('/file2.md', ['backend.database.mysql']);
            tagSystem.addTags('/file3.md', ['frontend.react']);

            expect(tagSystem.queryByTag('backend.database.postgres')).toEqual(['/file1.md']);
            expect(tagSystem.queryByTag('backend.database.mysql')).toEqual(['/file2.md']);
            expect(tagSystem.queryByTag('frontend.react')).toEqual(['/file3.md']);
        });

        it('should return files for parent tags', () => {
            tagSystem.addTags('/file1.md', ['backend.database.postgres']);
            tagSystem.addTags('/file2.md', ['backend.database.mysql']);
            tagSystem.addTags('/file3.md', ['backend.api']);

            const backendFiles = tagSystem.queryByTag('backend');
            expect(backendFiles).toHaveLength(3);

            const databaseFiles = tagSystem.queryByTag('backend.database');
            expect(databaseFiles).toHaveLength(2);
        });

        it('should return empty array for non-existent tag', () => {
            expect(tagSystem.queryByTag('non.existent.tag')).toEqual([]);
        });
    });

    describe('queryByWildcard', () => {
        beforeEach(() => {
            tagSystem.addTags('/file1.md', ['backend.database.postgres']);
            tagSystem.addTags('/file2.md', ['backend.database.mysql']);
            tagSystem.addTags('/file3.md', ['backend.api.rest']);
            tagSystem.addTags('/file4.md', ['frontend.react']);
        });

        it('should match single-level wildcard', () => {
            const files = tagSystem.queryByWildcard('backend.*');
            expect(files).toHaveLength(3);
            expect(files).toContain('/file1.md');
            expect(files).toContain('/file2.md');
            expect(files).toContain('/file3.md');
        });

        it('should match wildcard in middle of pattern', () => {
            const files = tagSystem.queryByWildcard('backend.*.postgres');
            expect(files).toEqual(['/file1.md']);
        });

        it('should match double-level wildcard pattern', () => {
            const files = tagSystem.queryByWildcard('backend.database.*');
            expect(files).toHaveLength(2);
            expect(files).toContain('/file1.md');
            expect(files).toContain('/file2.md');
        });

        it('should return empty array when wildcard matches nothing', () => {
            const files = tagSystem.queryByWildcard('nonexistent.*');
            expect(files).toEqual([]);
        });

        it('should handle recursive wildcard (**)', () => {
            tagSystem.addTags('/file5.md', ['backend.database.postgres.connection.pool']);

            const files = tagSystem.queryByWildcard('backend.**');
            expect(files.length).toBeGreaterThan(0);
            expect(files).toContain('/file1.md');
            expect(files).toContain('/file2.md');
            expect(files).toContain('/file3.md');
        });
    });

    describe('getAllTags', () => {
        it('should return all tags in the system', () => {
            tagSystem.addTags('/file1.md', ['backend.database.postgres']);
            tagSystem.addTags('/file2.md', ['frontend.react']);

            const allTags = tagSystem.getAllTags();

            expect(allTags.length).toBeGreaterThan(0);
            expect(allTags).toContain('backend');
            expect(allTags).toContain('backend.database');
            expect(allTags).toContain('backend.database.postgres');
            expect(allTags).toContain('frontend');
            expect(allTags).toContain('frontend.react');
        });

        it('should return empty array when no tags exist', () => {
            expect(tagSystem.getAllTags()).toEqual([]);
        });
    });

    describe('getTagsForFile', () => {
        it('should return all tags for a specific file', () => {
            tagSystem.addTags('/file1.md', ['backend.database.postgres', 'performance']);

            const tags = tagSystem.getTagsForFile('/file1.md');

            expect(tags).toContain('backend');
            expect(tags).toContain('backend.database');
            expect(tags).toContain('backend.database.postgres');
            expect(tags).toContain('performance');
        });

        it('should return empty array for file with no tags', () => {
            expect(tagSystem.getTagsForFile('/non-existent.md')).toEqual([]);
        });
    });

    describe('clear', () => {
        it('should clear all tags', () => {
            tagSystem.addTags('/file1.md', ['backend.database.postgres']);
            tagSystem.addTags('/file2.md', ['frontend.react']);

            tagSystem.clear();

            expect(tagSystem.size()).toBe(0);
            expect(tagSystem.getAllTags()).toEqual([]);
            expect(tagSystem.queryByTag('backend.database.postgres')).toEqual([]);
        });
    });

    describe('size', () => {
        it('should return the number of unique tags', () => {
            expect(tagSystem.size()).toBe(0);

            tagSystem.addTags('/file1.md', ['backend.database.postgres']);
            expect(tagSystem.size()).toBeGreaterThan(0);

            tagSystem.addTags('/file2.md', ['backend.database.postgres']);
            // Adding same tag for different file shouldn't increase unique tag count
            const sizeAfterDuplicate = tagSystem.size();

            tagSystem.addTags('/file3.md', ['frontend.react']);
            expect(tagSystem.size()).toBeGreaterThan(sizeAfterDuplicate);
        });
    });
});
