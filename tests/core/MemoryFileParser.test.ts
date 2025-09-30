import { describe, it, expect } from '@jest/globals';
import {
    MemoryFileParser,
    FrontmatterParseError,
    FrontmatterValidationError
} from '../../src/core/MemoryFileParser';

describe('MemoryFileParser', () => {
    describe('Valid frontmatter parsing', () => {
        it('should parse valid frontmatter with all required fields', () => {
            const content = `---
title: "Database Connection Patterns"
tags:
  - "backend.database.postgres"
  - "backend.connection-pool"
---

# Database Connection Patterns

This is the content of the file.`;

            const result = MemoryFileParser.parse(content);

            expect(result.frontmatter.title).toBe('Database Connection Patterns');
            expect(result.frontmatter.tags).toEqual([
                'backend.database.postgres',
                'backend.connection-pool'
            ]);
            expect(result.content).toBe('# Database Connection Patterns\n\nThis is the content of the file.');
        });

        it('should parse frontmatter with optional fields', () => {
            const content = `---
title: "Test Memory"
tags:
  - "tag1"
priority: high
created: 2025-09-30
updated: 2025-09-30
custom_field: "custom value"
---

Content here.`;

            const result = MemoryFileParser.parse(content);

            expect(result.frontmatter.title).toBe('Test Memory');
            expect(result.frontmatter.tags).toEqual(['tag1']);
            expect(result.frontmatter.priority).toBe('high');
            // js-yaml parses YYYY-MM-DD as Date objects
            expect(result.frontmatter.created).toBeInstanceOf(Date);
            expect(result.frontmatter.updated).toBeInstanceOf(Date);
            expect(result.frontmatter.custom_field).toBe('custom value');
        });

        it('should parse frontmatter with numeric priority', () => {
            const content = `---
title: "Test Memory"
tags:
  - "tag1"
priority: 5
---

Content.`;

            const result = MemoryFileParser.parse(content);

            expect(result.frontmatter.priority).toBe(5);
        });

        it('should handle frontmatter with inline array notation', () => {
            const content = `---
title: "Test Memory"
tags: ["tag1", "tag2", "tag3"]
---

Content.`;

            const result = MemoryFileParser.parse(content);

            expect(result.frontmatter.tags).toEqual(['tag1', 'tag2', 'tag3']);
        });
    });

    describe('Invalid frontmatter - missing delimiters', () => {
        it('should throw error when frontmatter does not start with ---', () => {
            const content = `title: "Test"
tags:
  - "tag1"
---

Content.`;

            expect(() => MemoryFileParser.parse(content)).toThrow(FrontmatterParseError);
            expect(() => MemoryFileParser.parse(content)).toThrow(
                'File does not start with YAML frontmatter delimiter (---)'
            );
        });

        it('should throw error when closing delimiter is missing', () => {
            const content = `---
title: "Test"
tags:
  - "tag1"

Content.`;

            expect(() => MemoryFileParser.parse(content)).toThrow(FrontmatterParseError);
            expect(() => MemoryFileParser.parse(content)).toThrow(
                'Could not find closing frontmatter delimiter (---)'
            );
        });
    });

    describe('Invalid frontmatter - missing required fields', () => {
        it('should throw error when title is missing', () => {
            const content = `---
tags:
  - "tag1"
---

Content.`;

            expect(() => MemoryFileParser.parse(content)).toThrow(FrontmatterValidationError);
            expect(() => MemoryFileParser.parse(content)).toThrow('Missing required field: title');
        });

        it('should throw error when tags are missing', () => {
            const content = `---
title: "Test Memory"
---

Content.`;

            expect(() => MemoryFileParser.parse(content)).toThrow(FrontmatterValidationError);
            expect(() => MemoryFileParser.parse(content)).toThrow('Missing required field: tags');
        });

        it('should throw error when tags is not an array', () => {
            const content = `---
title: "Test Memory"
tags: "not-an-array"
---

Content.`;

            expect(() => MemoryFileParser.parse(content)).toThrow(FrontmatterValidationError);
            expect(() => MemoryFileParser.parse(content)).toThrow('Field "tags" must be an array');
        });

        it('should throw error when tags array is empty', () => {
            const content = `---
title: "Test Memory"
tags: []
---

Content.`;

            expect(() => MemoryFileParser.parse(content)).toThrow(FrontmatterValidationError);
            expect(() => MemoryFileParser.parse(content)).toThrow(
                'Field "tags" must contain at least one tag'
            );
        });

        it('should throw error when title is not a string', () => {
            const content = `---
title: 123
tags:
  - "tag1"
---

Content.`;

            expect(() => MemoryFileParser.parse(content)).toThrow(FrontmatterValidationError);
            expect(() => MemoryFileParser.parse(content)).toThrow('Field "title" must be a string');
        });

        it('should throw error when tags contain non-string values', () => {
            const content = `---
title: "Test Memory"
tags:
  - "tag1"
  - 123
  - "tag2"
---

Content.`;

            expect(() => MemoryFileParser.parse(content)).toThrow(FrontmatterValidationError);
            expect(() => MemoryFileParser.parse(content)).toThrow('All tags must be strings');
        });
    });

    describe('Malformed YAML', () => {
        it('should throw error when YAML is malformed', () => {
            const content = `---
title: "Test Memory
tags:
  - "tag1"
---

Content.`;

            expect(() => MemoryFileParser.parse(content)).toThrow(FrontmatterParseError);
            expect(() => MemoryFileParser.parse(content)).toThrow(/Failed to parse YAML/);
        });

        it('should throw error when YAML is empty', () => {
            const content = `---
---

Content.`;

            expect(() => MemoryFileParser.parse(content)).toThrow(FrontmatterParseError);
            expect(() => MemoryFileParser.parse(content)).toThrow('YAML frontmatter is empty');
        });

        it('should throw error when YAML is an array instead of object', () => {
            const content = `---
- item1
- item2
---

Content.`;

            expect(() => MemoryFileParser.parse(content)).toThrow(FrontmatterParseError);
            expect(() => MemoryFileParser.parse(content)).toThrow(
                'YAML frontmatter must be an object'
            );
        });
    });

    describe('Content extraction', () => {
        it('should correctly extract content with multiple paragraphs', () => {
            const content = `---
title: "Test"
tags: ["tag1"]
---

# Heading

Paragraph 1.

Paragraph 2.`;

            const result = MemoryFileParser.parse(content);

            expect(result.content).toBe('# Heading\n\nParagraph 1.\n\nParagraph 2.');
        });

        it('should trim leading/trailing whitespace from content', () => {
            const content = `---
title: "Test"
tags: ["tag1"]
---


Content here.


`;

            const result = MemoryFileParser.parse(content);

            expect(result.content).toBe('Content here.');
        });

        it('should handle empty content after frontmatter', () => {
            const content = `---
title: "Test"
tags: ["tag1"]
---

`;

            const result = MemoryFileParser.parse(content);

            expect(result.content).toBe('');
        });
    });
});
