# Testing Guide for Memory Manager Extension

## Step-by-Step Testing Instructions

### 1. Create Sample Memory Files

First, create the Memory directory and some test files in your workspace.

#### Create Memory Directory
Create a folder called `Memory` in your workspace root.

#### Sample Memory File 1: Backend Database
Create `Memory/backend-database.md`:

```markdown
---
title: "PostgreSQL Database Configuration"
tags:
  - backend.database.postgres
  - backend.configuration
---

## Connection String Format

Use the following format for PostgreSQL connections:
```
postgresql://username:password@hostname:port/database
```

## Best Practices

- Always use connection pooling
- Set max connections based on your server capacity
- Use SSL in production environments
- Keep connection strings in environment variables
```

#### Sample Memory File 2: Frontend State Management
Create `Memory/frontend-state.md`:

```markdown
---
title: "React State Management Patterns"
tags:
  - frontend.react.state
  - frontend.patterns
---

## State Management Options

1. **useState** - For local component state
2. **useContext** - For shared state across components
3. **Redux** - For complex global state
4. **Zustand** - Lightweight alternative to Redux

## When to Use Each

- Small apps: useState + useContext
- Medium apps: Zustand
- Large apps with complex state: Redux
```

#### Sample Memory File 3: API Design
Create `Memory/api-design.md`:

```markdown
---
title: "RESTful API Design Guidelines"
tags:
  - backend.api.rest
  - backend.design
---

## HTTP Methods

- **GET** - Retrieve resources
- **POST** - Create new resources
- **PUT** - Update entire resource
- **PATCH** - Update partial resource
- **DELETE** - Remove resource

## Status Codes

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Server Error
```

### 2. Verify Extension is Active

1. Open VS Code Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Developer: Show Running Extensions"
3. Look for "Memory Manager" in the list - it should show as running

### 3. Verify Files Are Indexed

Check the Output panel:
1. Open Output panel (`View > Output` or `Ctrl+Shift+U`)
2. Select "Log (Window)" from the dropdown
3. You should see logs about the extension activating and indexing files

### 4. Test in Copilot Chat

Open Copilot Chat and test with these commands:

#### Test 1: Query Specific Tag
```
@memory /memory-tag backend.database.postgres
```

**Expected Result**: Should display the PostgreSQL Database Configuration memory content.

#### Test 2: Query with Wildcard
```
@memory /memory-tag backend.*
```

**Expected Result**: Should display all backend-related memories (database + API design).

#### Test 3: Query Parent Tag
```
@memory /memory-tag frontend
```

**Expected Result**: Should display the React State Management memory.

#### Test 4: Query Non-existent Tag
```
@memory /memory-tag nonexistent.tag
```

**Expected Result**: Should display "No memories found with tag: nonexistent.tag"

### 5. Verify Auto-Indexing

Test that new files are automatically indexed:

1. Create a new file `Memory/test-new.md`:
```markdown
---
title: "Test New Memory"
tags:
  - test.new
---

This is a test memory to verify auto-indexing works.
```

2. Save the file
3. Immediately try querying it in Copilot Chat:
```
@memory /memory-tag test.new
```

**Expected Result**: The new memory should be found and displayed.

### 6. Test File Modification

1. Open `Memory/test-new.md`
2. Change the content to:
```markdown
---
title: "Test New Memory - Updated"
tags:
  - test.new
  - test.updated
---

This content has been updated to test file watching.
```

3. Save the file
4. Query the updated tag:
```
@memory /memory-tag test.updated
```

**Expected Result**: Should find the memory with updated content.

## Troubleshooting

### Extension Not Showing in Chat
- Make sure you're using `@memory` (with @) not `#memory`
- Verify the extension is installed and active
- Try reloading VS Code (`Developer: Reload Window`)

### No Memories Found
- Check that Memory folder exists in workspace root
- Verify memory files have valid YAML frontmatter
- Ensure tags are properly formatted as arrays in frontmatter
- Check Output panel for any errors

### Chat Participant Not Available
- Ensure GitHub Copilot extension is installed and active
- Verify you're using VS Code 1.104.0 or higher
- The participant ID is `memory.manager`

### Files Not Auto-Indexing
- Check that files are saved with `.md` extension
- Verify files are inside the `Memory/` directory
- Look for errors in the Output panel
- Try manually reloading the window

## Verification Checklist

- [ ] Extension shows as running in "Show Running Extensions"
- [ ] Memory directory exists in workspace root
- [ ] At least 3 test memory files created
- [ ] Can query specific tags (e.g., `backend.database.postgres`)
- [ ] Can query with wildcards (e.g., `backend.*`)
- [ ] Can query parent tags
- [ ] New files are automatically indexed
- [ ] Modified files are automatically re-indexed
- [ ] Chat displays memory content correctly

## Next Steps

Once testing is complete and working:
1. Create your own memory files for your project
2. Organize them with meaningful hierarchical tags
3. Use `@memory /memory-tag <tag>` in Copilot Chat to inject context
4. Experiment with wildcard patterns for broader queries
