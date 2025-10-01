# VS Code Copilot Add-in: Custom Prompt Trigger

## Goal

Create a Visual Studio Code extension that provides a **Memory Management System** for GitHub Copilot. The extension should:

- Maintain a local `Memory/` folder containing tagged markdown files as a knowledge base
- Register as a Copilot Chat participant to intercept `#memory-tag XXX` commands
- Parse markdown files for tag-based retrieval and attach matching files to Copilot Chat context
- Enable users to build and maintain project-specific knowledge that enhances Copilot responses

## Core Concept

Users create markdown files in a `Memory/` folder with structured headers containing tags and metadata. When they type `#memory-tag XXX` on the first line in Copilot Chat, the extension finds all memory files tagged with "XXX" and attaches them to the chat context using VS Code's `github.copilot.chat.attachFile` command. The remaining lines of the prompt are passed to Copilot as the user's actual question.

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
- **Content Injection Engine**: Attach memory files to chat context using `github.copilot.chat.attachFile` command
- **File Attachment System**: Use VS Code's native file attachment mechanism for reliable context injection
- **Prompt Parsing**: Two-phase processing - extract tag from first line, use remaining lines as user prompt
- **File Watcher System**: Real-time monitoring of Memory folder for index updates
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
  - First line contains the tag pattern
  - Remaining lines contain the actual user prompt for Copilot

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
- **File Attachment**: Use `github.copilot.chat.attachFile` command to attach memory files to chat context
- **Automatic Context**: VS Code handles file content injection automatically
- **No Manual Processing**: Memory files are attached as-is with YAML frontmatter included
- **Multiple Files**: All matching files are attached in a single command call
- **Prompt Separation**: Tag pattern on first line, user prompt on remaining lines

### Example Usage Flow

**User Input:**
```
#memory-tag backend.database
How do I implement connection pooling for high-traffic scenarios?
```

**Extension Processing:**
1. Parse first line: tag = `backend.database`
2. Find 3 matching memory files
3. Execute `github.copilot.chat.attachFile` with all 3 file URIs
4. Extract user prompt: `How do I implement connection pooling for high-traffic scenarios?`
5. Let Copilot process the prompt with attached memory context

## Technical Approach

1. **Scaffold the Extension**
   - Use the VS Code Extension Generator (`yo code`) to create a new extension project (TypeScript recommended).

2. **Register as a Copilot Chat Participant**
   - In the extension's `activate` function, use the Copilot Chat API to register a participant.
   - Example:
     ```typescript
     const participant = vscode.chat.createChatParticipant('your.extension.id', async (request, context, response, token) => {
         if (request.command === 'memory-tag') {
             const lines = request.prompt.split('\n');
             const tagPattern = lines[0].trim();
             const userPrompt = lines.slice(1).join('\n').trim();
             
             // Find matching memory files
             const memoryFiles = await findMemoriesByTag(tagPattern);
             
             // Attach files to chat context
             await vscode.commands.executeCommand(
                 'github.copilot.chat.attachFile',
                 ...memoryFiles.map(f => f.uri)
             );
             
             // Let Copilot process the user prompt with attached context
         }
     });
     context.subscriptions.push(participant);
     ```
   - This allows your extension to receive and respond to chat prompts in Copilot.

3. **Parse Command and Prompt**
   - In the participant handler, check if `request.command` is `memory-tag`.
   - Split the prompt by lines: first line contains tag pattern, remaining lines are the user prompt.
   - Example:
     ```typescript
     if (request.command === 'memory-tag') {
         const lines = request.prompt.split('\n');
         const tagPattern = lines[0].trim();
         const userPrompt = lines.slice(1).join('\n').trim();
         // Process tag pattern and attach matching files
     }
     ```

4. **Attach Memory Files to Context**
   - Find all memory files matching the tag pattern.
   - Use `github.copilot.chat.attachFile` command to attach files.
   - VS Code will automatically inject file contents into Copilot's context.

5. **Testing**
   - Run and debug the extension in VS Code.
   - In the Copilot Chat window, type `#memory-tag <tag>` followed by your question on subsequent lines.