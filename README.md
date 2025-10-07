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
- GitVersion (for automatic versioning using GitFlow)

### Installing Required Tools

```bash
# Install vsce
npm install -g vsce

# Install GitVersion (requires .NET runtime)
dotnet tool install --global GitVersion.Tool
```

> **Note**: GitVersion is optional but recommended. It automatically calculates version numbers based on your Git history and GitFlow branching strategy. See [GitVersion Setup](docs/GitVersion-Setup.md) for details.

## Building the Extension

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/alkampfergit/vscode-memory-manager.git
   cd vscode-memory-manager
   npm install
   ```

2. Build and package the extension:
   ```bash
   npm run build
   ```

   This will:
   - Run the linter to check code quality
   - Compile TypeScript code
   - Automatically update the version using GitVersion
   - Create a `.vsix` file like `vscode-memory-manager-1.2.0-alpha.5.vsix` in the project root

   The version will be automatically determined from GitVersion based on your current Git branch.

   See [GitVersion Setup](docs/GitVersion-Setup.md) for more information on versioning.

   **Note:** You can also run `npm run package` separately if you only want to create the `.vsix` file without running lint and compile again.

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

- [USER_GUIDE.md](docs/USER_GUIDE.md) - Detailed documentation on creating and using memory files
- [GitVersion Setup](docs/GitVersion-Setup.md) - Automatic versioning with GitFlow

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Repository

https://github.com/alkampfergit/vscode-memory-manager
