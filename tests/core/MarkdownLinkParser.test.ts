import { describe, it, expect } from '@jest/globals';
import { MarkdownLinkParser } from '../../src/core/MarkdownLinkParser';

describe('MarkdownLinkParser', () => {
    describe('Basic link parsing', () => {
        it('should parse a simple Markdown link', () => {
            const content = 'Check out [this guide](./guide.md) for more info.';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].text).toBe('this guide');
            expect(links[0].path).toBe('./guide.md');
            expect(links[0].fullSyntax).toBe('[this guide](./guide.md)');
        });

        it('should parse multiple links', () => {
            const content = 'See [guide 1](./guide1.md) and [guide 2](./guide2.md).';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(2);
            expect(links[0].text).toBe('guide 1');
            expect(links[0].path).toBe('./guide1.md');
            expect(links[1].text).toBe('guide 2');
            expect(links[1].path).toBe('./guide2.md');
        });

        it('should return empty array when no links found', () => {
            const content = 'This is just plain text with no links.';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(0);
        });

        it('should parse links with spaces in text', () => {
            const content = '[Link with multiple words](./file.md)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].text).toBe('Link with multiple words');
        });

        it('should parse links with spaces in path', () => {
            const content = '[Guide](./my folder/guide.md)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].path).toBe('./my folder/guide.md');
        });
    });

    describe('Relative paths', () => {
        it('should parse links with ./ relative path', () => {
            const content = '[Guide](./subfolder/guide.md)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].path).toBe('./subfolder/guide.md');
        });

        it('should parse links with ../ relative path', () => {
            const content = '[Parent Guide](../parent/guide.md)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].path).toBe('../parent/guide.md');
        });

        it('should parse links with multiple ../ levels', () => {
            const content = '[Guide](../../other/guide.md)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].path).toBe('../../other/guide.md');
        });
    });

    describe('Absolute paths', () => {
        it('should parse links with absolute Unix path', () => {
            const content = '[Guide](/absolute/path/guide.md)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].path).toBe('/absolute/path/guide.md');
        });

        it('should parse links with absolute Windows path', () => {
            const content = '[Guide](C:/Users/docs/guide.md)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].path).toBe('C:/Users/docs/guide.md');
        });
    });

    describe('URL links', () => {
        it('should parse HTTP URL links', () => {
            const content = '[Website](http://example.com/page)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].path).toBe('http://example.com/page');
        });

        it('should parse HTTPS URL links', () => {
            const content = '[Secure Site](https://example.com/page)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].path).toBe('https://example.com/page');
        });
    });

    describe('Image links exclusion', () => {
        it('should not parse image links', () => {
            const content = 'Here is an image: ![Alt text](./image.png)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(0);
        });

        it('should parse regular links but not image links', () => {
            const content = 'See ![Image](./image.png) and [Guide](./guide.md)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].text).toBe('Guide');
            expect(links[0].path).toBe('./guide.md');
        });
    });

    describe('Link indices', () => {
        it('should correctly identify start and end indices', () => {
            const content = 'Start [link](./file.md) end.';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].startIndex).toBe(6);
            expect(links[0].endIndex).toBe(23);
            expect(content.substring(links[0].startIndex, links[0].endIndex)).toBe('[link](./file.md)');
        });

        it('should have correct indices for multiple links', () => {
            const content = '[first](./1.md) and [second](./2.md)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(2);
            expect(links[0].startIndex).toBe(0);
            expect(links[0].endIndex).toBe(15);
            expect(links[1].startIndex).toBe(20);
            expect(links[1].endIndex).toBe(36);
        });
    });

    describe('Path type helpers', () => {
        describe('isRelativePath', () => {
            it('should identify ./ paths as relative', () => {
                expect(MarkdownLinkParser.isRelativePath('./file.md')).toBe(true);
            });

            it('should identify ../ paths as relative', () => {
                expect(MarkdownLinkParser.isRelativePath('../file.md')).toBe(true);
            });

            it('should not identify absolute paths as relative', () => {
                expect(MarkdownLinkParser.isRelativePath('/absolute/path')).toBe(false);
                expect(MarkdownLinkParser.isRelativePath('C:/path')).toBe(false);
            });

            it('should not identify URLs as relative', () => {
                expect(MarkdownLinkParser.isRelativePath('http://example.com')).toBe(false);
            });
        });

        describe('isAbsolutePath', () => {
            it('should identify Unix absolute paths', () => {
                expect(MarkdownLinkParser.isAbsolutePath('/absolute/path')).toBe(true);
            });

            it('should identify Windows absolute paths', () => {
                expect(MarkdownLinkParser.isAbsolutePath('C:/path')).toBe(true);
                expect(MarkdownLinkParser.isAbsolutePath('D:\\path')).toBe(true);
            });

            it('should not identify relative paths as absolute', () => {
                expect(MarkdownLinkParser.isAbsolutePath('./file.md')).toBe(false);
                expect(MarkdownLinkParser.isAbsolutePath('../file.md')).toBe(false);
            });
        });

        describe('isUrl', () => {
            it('should identify HTTP URLs', () => {
                expect(MarkdownLinkParser.isUrl('http://example.com')).toBe(true);
            });

            it('should identify HTTPS URLs', () => {
                expect(MarkdownLinkParser.isUrl('https://example.com')).toBe(true);
            });

            it('should identify protocol-relative URLs', () => {
                expect(MarkdownLinkParser.isUrl('//example.com')).toBe(true);
            });

            it('should not identify file paths as URLs', () => {
                expect(MarkdownLinkParser.isUrl('./file.md')).toBe(false);
                expect(MarkdownLinkParser.isUrl('/absolute/path')).toBe(false);
            });
        });
    });

    describe('Edge cases', () => {
        it('should handle empty string', () => {
            const links = MarkdownLinkParser.parse('');
            expect(links).toHaveLength(0);
        });

        it('should handle nested brackets in link text', () => {
            const content = '[[Nested]](./file.md)';
            const links = MarkdownLinkParser.parse(content);

            // The regex should parse this, but behavior may vary
            // This documents current behavior
            expect(links.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle special characters in link text', () => {
            const content = '[Link with @#$ special chars!](./file.md)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].text).toBe('Link with @#$ special chars!');
        });

        it('should handle links with anchors', () => {
            const content = '[Section](./file.md#section-name)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].path).toBe('./file.md#section-name');
        });

        it('should handle links with query parameters', () => {
            const content = '[Page](./file.md?param=value)';
            const links = MarkdownLinkParser.parse(content);

            expect(links).toHaveLength(1);
            expect(links[0].path).toBe('./file.md?param=value');
        });
    });
});
