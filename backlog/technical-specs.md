# VS Code Copilot Add-in: Custom Prompt Trigger

## Goal

Create a Visual Studio Code extension that provides a **Memory Management System** for GitHub Copilot. The extension should:

- Maintain a local `Memory/` folder containing tagged markdown files as a knowledge base
- Register as a Copilot Chat participant to intercept `#memory-tag XXX` commands
- Parse markdown files for tag-based retrieval and inject matching content into Copilot prompts
- Enable users to build and maintain project-specific knowledge that enhances Copilot responses

## Core Concept

Users create markdown files in a `Memory/` folder with structured headers containing tags and metadata. When they type `#memory-tag XXX` in Copilot Chat, the extension finds all memory files tagged with "XXX" and injects their content as context for Copilot to use in generating responses.

## Features

### Technology Stack & Architecture
- **Language**: TypeScript (first VS Code extension project)
- **Package Management**: npm (no constraints)
- **Testing Framework**: Jest (most common, optimal for LLM compatibility)
- **Architecture Pattern**: Clean Architecture with VS Code API isolation layer
- **Testing Strategy**: Two-tier testing approach
  - **Feature-Level Tests**: Test individual functions and classes in isolation
  - **Module Integration Tests**: Test complete feature modules working together
- **VS Code Isolation**: Complete separation of business logic from VS Code dependencies
- **Adapter Pattern**: VS Code APIs accessed only through testable adapter interfaces

### Error Handling & Reliability Strategy
- **Non-Intrusive Error Handling**: Never interrupt user workflow with modal dialogs or blocking errors
- **YAML Validation**: Invalid frontmatter logs error and excludes file from memory injection
- **Graceful Failure**: Malformed files are skipped silently, valid files continue to work
- **Prominent Error Reporting**: Use VS Code's built-in error reporting mechanisms
  - Output Channel for detailed error logs
  - Status Bar indicators for memory system health
  - Problems Panel integration for file-specific validation errors
- **Silent Recovery**: Automatic re-indexing when files are corrected
- **User-Friendly Feedback**: Clear error messages indicating which files need attention

### Project Structure & Testing Priorities
- **Core Module Organization**:
  - `src/core/` - Pure business logic (fully testable without VS Code)
  - `src/adapters/` - VS Code API integration layer
  - `src/extension.ts` - Extension entry point
  - `tests/` - Test files mirroring source structure
- **Primary Testing Focus**:
  - **File Parser** - YAML frontmatter extraction and validation (critical for reliability)
  - **Link Resolver** - Markdown link discovery and content expansion (complex logic)
  - **File Watcher Integration** - Real-time memory updates on disk changes (event-driven complexity)
- **File Refresh Architecture**: Individual file refresh method triggered by file system events
- **Memory Synchronization**: Immediate in-memory updates when files change on disk

### Debug & Troubleshooting Features
- **Memory Inspection Commands**: VS Code commands to view current memory state
  - `Memory Manager: Show All Tags` - Display hierarchical tag structure with file counts
  - `Memory Manager: Show Memory Contents` - View parsed memory files and their metadata
  - `Memory Manager: Rebuild Memory Index` - Force complete re-read of Memory folder
- **Debug Output**: Structured logging for troubleshooting memory system behavior
- **Memory Health Status**: Real-time indicators of memory system state and any issues

### Performance & Scaling Strategy
- **Memory Collection Size**: No artificial limits - handle collections of any size gracefully
- **File Change Processing**: Immediate processing without debouncing for real-time responsiveness
- **Contention Management**: Queue-based file change processing to prevent race conditions
- **Link Resolution Strategy**: On-demand resolution during `#memory-tag` command execution
- **Single-Level Resolution**: Only resolve direct links from memory files (no recursive linking)
- **Resource Efficiency**: Minimal memory footprint with lazy loading of linked content

### Development Workflow & CI/CD Pipeline
- **Development Experience**: Hot reload development with immediate VS Code testing capability
- **Watch Mode**: Automatic TypeScript compilation and extension reload on code changes
- **Distribution Strategy**: Manual distribution via .vsix files (no marketplace initially)
- **Build Automation**: Single-command build script for complete project compilation and packaging
- **GitHub Actions**: Automated CI/CD pipeline generating deployable .vsix artifacts
- **Code Quality**: ESLint + Prettier integration for consistent, agent-friendly code style
- **Development Scripts**: Streamlined npm scripts for development, testing, and building

### Core Technical Features
- **Memory File Management**: Parse and index markdown files in `Memory/` folder with YAML frontmatter
- **Hierarchical Tag System**: Support nested tags (e.g., `backend.database.postgres`) with wildcard queries (`backend.*`)
- **Markdown Link Parser**: Parse standard `[text](path)` syntax to discover file references within memory content
- **YAML Frontmatter Parser**: Extract mandatory fields (title, tags) and optional metadata from clean headers
- **Chat Participant Integration**: VS Code Copilot Chat API integration with `#memory-tag` command processing
- **Content Injection Engine**: Inject memory content with inline expansion of first-level linked content
- **Link Resolution System**: Resolve first-level markdown links and append referenced content inline
- **Link Processing Strategy**: Remove `[text](path)` syntax, keep text, append referenced file content
- **Single-Level Reference**: Follow only direct links, do not process links within referenced content
- **File Watcher System**: Real-time monitoring of Memory folder and referenced files for index updates
- **Memory Index Cache**: Performance-optimized in-memory index with hierarchical tag lookup
- **Command Router**: Parse `#memory-tag` commands with intelligent tag completion
- **IntelliSense Integration**: VS Code completion provider for tag autocompletion in Copilot Chat
- **Tag Completion Engine**: Real-time suggestions based on indexed tags with hierarchical support
- **Fuzzy Matching**: Smart tag suggestions with partial matching and wildcard preview

### Memory File Structure
```yaml
---
title: "Database Connection Patterns"  # MANDATORY
tags: ["backend.database.postgres", "backend.connection-pool"]  # MANDATORY, hierarchical
priority: high  # OPTIONAL
created: 2025-09-30  # OPTIONAL
updated: 2025-09-30  # OPTIONAL
---

# Database Connection Patterns

This pattern builds on [Connection Pool Setup](./connection-pool.md) and references the 
[Database Configuration Guide](../docs/db-config.md) for environment setup.

## Implementation
When implementing database connections, always consider...

See also: [Error Handling Patterns](./error-handling.md) for robust connection management.
```

### MVP Command Set
- `#memory-tag <tag-pattern>` - Primary command for memory retrieval with IntelliSense support

### IntelliSense Features
- **Tag Autocompletion**: After typing `#memory-tag `, show available tags in completion dropdown
- **Hierarchical Navigation**: Type `backend.` to see all backend subtags (`database`, `auth`, etc.)
- **Fuzzy Matching**: Type `post` to match `backend.database.postgres` or `frontend.posts`
- **Wildcard Preview**: Show `backend.*` options when typing partial hierarchical paths
- **Usage Hints**: Display number of memory files per tag in completion items
- **Recent Tags**: Prioritize recently used tags in completion suggestions

### Supported Query Patterns  
- `#memory-tag backend.database` - Exact hierarchical tag match
- `#memory-tag backend.*` - Wildcard match for all backend subtags  
- `#memory-tag postgres` - Simple tag match with IntelliSense assistance

### Content Processing Rules
- **Original Content**: Include full memory file content (excluding YAML frontmatter)
- **Link Processing**: Transform `[Connection Pool Setup](./connection-pool.md)` → `Connection Pool Setup` + append file content
- **Single-Level Resolution**: Only follow direct links in original memory files, ignore links in referenced content
- **Content Boundaries**: No special separators - seamless inline expansion for natural reading
- **User Content Control**: No automatic truncation or size limits - user manages content size

### Example Content Processing
**Original Memory File:**
```markdown
This pattern builds on [Connection Pool Setup](./connection-pool.md) for database management.
```

**Processed for Copilot Injection:**
```markdown
This pattern builds on Connection Pool Setup for database management.

[Full content of connection-pool.md appended here...]
```

## Technical Approach

1. **Scaffold the Extension**
   - Use the VS Code Extension Generator (`yo code`) to create a new extension project (TypeScript recommended).

2. **Register as a Copilot Chat Participant**
   - In the extension's `activate` function, use the Copilot Chat API to register a participant.
   - Example:
     ```typescript
     const participant = vscode.chat.createChatParticipant('your.extension.id', (request, context, response, token) => {
         // Handler logic goes here
     });
     context.subscriptions.push(participant);
     ```
   - This allows your extension to receive and respond to chat prompts in Copilot.

3. **Trigger on `#`**
   - In the participant handler, check if the prompt starts with `#`.
   - If so, parse the input, decide what context to add, and modify the prompt or response as needed.
   - Example:
     ```typescript
     if (request.prompt.startsWith('#')) {
         const userInput = request.prompt.slice(1).trim();
         // Decide what context to inject based on userInput
         // Optionally, modify the prompt or provide a custom response
     }
     ```

4. **Inject Context or Modify Prompt**
   - Based on the parsed input, add relevant context or information to the Copilot prompt or response.

5. **Testing**
   - Run and debug the extension in VS Code.
   - In the Copilot Chat window, type `# your custom command` to trigger your extension logic.

## Example Usage

### Memory Retrieval with IntelliSense
1. User types `#memory-tag ` in Copilot Chat
2. Extension shows completion dropdown with available tags:
   ```
   ▼ backend.database.postgres (3 memories)
   ▼ backend.auth.jwt (2 memories)  
   ▼ frontend.components (5 memories)
   ▼ testing.unit (1 memory)
   ```
3. User selects or continues typing `backend.`
4. Extension shows hierarchical subtags:
   ```
   ▼ backend.database (4 memories)
   ▼ backend.auth (3 memories)
   ▼ backend.* (7 memories total)
   ```
5. User selects `backend.database` and extension injects all matching memories

### Manual Memory Creation (MVP Scope)
- Users manually create `.md` files in `Memory/` folder
- Users manually write YAML frontmatter with title and tags
- Extension automatically indexes new files via file watcher
- IntelliSense immediately reflects new tags in completion suggestions

## References

- [GitHub Copilot Extensions: Creating a VS Code Copilot Extension]
- [VS Code Copilot Documentation]

: https://pascoal.net/2024/10/31/gh-copilot-extensions-vscode-creating-extension/
: https://code.visualstudio.com/docs/copilot/overview
: https://code.visualstudio.com/docs/copilot/getting-started