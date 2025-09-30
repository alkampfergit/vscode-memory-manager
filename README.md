# VS Code Memory Manager

A Visual Studio Code extension that enables you to create, manage, and inject contextual knowledge into GitHub Copilot Chat conversations using a hierarchical tag-based system.

## Features

- **Memory Files**: Create markdown files with YAML frontmatter to store knowledge
- **Hierarchical Tags**: Organize memories using dot-notation tags (e.g., `backend.database.postgres`)
- **Copilot Integration**: Query memories directly in Copilot Chat using `@memory /memory-tag <tag>`
- **Wildcard Support**: Use wildcards to match multiple tags (e.g., `backend.*`, `*.postgres`)
- **Auto-Indexing**: Automatically detects and indexes memory files as you create/modify them

## Prerequisites

- Visual Studio Code 1.104.0 or higher
- Node.js and npm installed
- `vsce` (Visual Studio Code Extensions) tool for building

### Installing vsce

```bash
npm install -g vsce
```

## Building the Extension

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/alkampfergit/vscode-memory-manager.git
   cd vscode-memory-manager
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Package the extension into a `.vsix` file:
   ```bash
   npm run package
   ```

   This will create a file like `vscode-memory-manager-1.0.0.vsix` in the project root.

## Installing the Extension

1. Open Visual Studio Code
2. Go to the **Extensions** view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Click on the **...** (More Actions) menu at the top of the Extensions view
4. Select **Install from VSIX...**
5. Navigate to the project root, select the `.vsix` file you created, and click **Install**
6. After installation, VS Code will prompt you to reload the window. Click **Reload Now**

## Usage

### Creating Memory Files

1. Create a `Memory/` directory in your workspace root
2. Create a new `.md` file inside the `Memory/` directory
3. Add YAML frontmatter with title and tags:

```markdown
---
title: "PostgreSQL Connection Setup"
tags:
  - backend.database.postgres
  - backend.configuration
---

## Connection String

Use `postgresql://user:pass@host:port/database` format.

## Best Practices

- Always use connection pooling
- Enable SSL for production
```

4. Save the file - it will be automatically indexed

### Querying Memories in Copilot Chat

Open Copilot Chat and use the memory manager participant:

```
@memory /memory-tag backend.database
```

**Examples:**
- `@memory /memory-tag backend.database.postgres` - Get specific postgres memories
- `@memory /memory-tag backend.*` - Get all backend-related memories
- `@memory /memory-tag *.postgres` - Get all postgres memories at any level

The extension will retrieve matching memories and display them in the chat, making them available as context for Copilot.

## Development

### Running Tests

```bash
npm test
```

### Watching for Changes

```bash
npm run watch
```

### Linting

```bash
npm run lint
```

## Project Structure

```
vscode-memory-manager/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── chat/
│   │   ├── CommandRouter.ts      # Parses chat commands
│   │   └── ContentInjectionEngine.ts  # Retrieves memory content
│   └── core/
│       ├── MemoryIndex.ts        # In-memory cache for memories
│       ├── TagSystem.ts          # Hierarchical tag management
│       └── MemoryManagerService.ts  # Main service coordinator
├── Memory/                       # Your memory files go here
└── docs/
    └── USER_GUIDE.md            # Detailed user guide
```

## Documentation

See [USER_GUIDE.md](docs/USER_GUIDE.md) for detailed documentation on creating and using memory files.

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Repository

https://github.com/alkampfergit/vscode-memory-manager
