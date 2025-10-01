# Memory Manager - User Guide

## Creating Memory Files

The Memory Manager extension allows you to create and organize knowledge that can be injected into Copilot Chat conversations.

### Manual Memory Creation

1. **Create a new `.md` file** inside the `Memory/` directory in your workspace root
   - Example: `Memory/backend-database.md`

2. **Add YAML frontmatter** at the top of the file with required fields:
   ```markdown
   ---
   title: "Your Memory Title"
   tags:
     - backend.database.postgres
     - backend.connection-pool
   ---

   Your memory content goes here...
   ```

3. **Save the file** - The extension will automatically:
   - Detect the new file
   - Parse the frontmatter and content
   - Index it in the memory system
   - Make the tags available for querying

### Tag System

Tags use a hierarchical dot notation:
- `backend.database.postgres` - Specific tag
- `backend.database` - Parent tag (includes all children)
- `backend.*` - Wildcard (matches all tags under backend)
- `*.postgres` - Matches postgres at any level

### Using Memories in Copilot Chat

Once your memory files are created and indexed, you can query them in Copilot Chat:

1. Open Copilot Chat
2. Use the memory manager participant: `@memory /memory-tag <tag>`
3. Examples:
   - `@memory /memory-tag backend.database` - Get all database-related memories
   - `@memory /memory-tag backend.*` - Get all backend memories
   - `@memory /memory-tag *.postgres` - Get all postgres-related memories

The extension will retrieve and display all matching memory content, which Copilot can then use to answer your questions.

### Example Memory File

Create `Memory/postgres-connection.md`:

```markdown
---
title: "PostgreSQL Connection Configuration"
tags:
  - backend.database.postgres
  - backend.configuration
---

## Connection String Format

Use the following format for PostgreSQL connections:
`postgresql://username:password@hostname:port/database`

## Best Practices

- Always use connection pooling
- Set max connections based on your server capacity
- Use SSL in production environments
```

After saving, you can query it with:
- `@memory /memory-tag backend.database.postgres`
- `@memory /memory-tag backend.*`
