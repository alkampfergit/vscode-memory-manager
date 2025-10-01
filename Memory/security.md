---
title: "Memory related to security"
tags:
  - security
---

# Security Best Practices

## Input & Validation
- **ALWAYS** validate and sanitize all user inputs (file paths, tag patterns, YAML frontmatter)
- **NEVER** execute user-provided strings as code (`eval()`, `Function()`, shell commands)
- Normalize paths to prevent directory traversal attacks (`../../etc/passwd`)
- Validate YAML against strict schema; handle parse errors gracefully

## File System Security
- **ONLY** access files within workspace or Memory folder boundaries
- Validate all file paths before read/write operations
- **NEVER** follow symbolic links outside Memory folder without user consent
- Set maximum file size limits for linked content

## Secrets & Credentials
- **NEVER** hardcode API keys, tokens, or credentials
- **NEVER** log sensitive information
- Use VS Code's SecretStorage API for sensitive data
- Add secret patterns to `.gitignore`

## Dependencies & Supply Chain
- Keep dependencies updated; run `npm audit` regularly
- Minimize dependency count to reduce attack surface
- Pin versions in production builds

## Error Handling
- **NEVER** expose sensitive info in error messages (paths, stack traces)
- Log errors to Output Channel, not modal dialogs
- Handle all promise rejections

## VS Code Extension Specific
- Request minimum necessary permissions in package.json
- Validate URIs before passing to `github.copilot.chat.attachFile`
- Limit attached file sizes to prevent resource exhaustion
- Treat all memory file content as untrusted input

## Code Review Checklist
- [ ] All inputs validated and sanitized
- [ ] No hardcoded secrets
- [ ] File access restricted to allowed directories
- [ ] Error messages sanitized
- [ ] Dependencies audited
- [ ] Proper async error handling


