# GitVersion Integration Changelog

## Summary

Integrated GitVersion tool for automatic semantic versioning based on GitFlow branching strategy.

## Changes Made

### 1. Configuration Files

#### `GitVersion.yml` (NEW)
- GitVersion configuration for GitFlow workflow
- Defines versioning strategy for all branch types:
  - **master**: Production releases (e.g., `1.0.0`)
  - **develop**: Alpha releases (e.g., `1.1.0-alpha.5`)
  - **release/**: Beta releases (e.g., `1.1.0-beta.1`)
  - **feature/**: Feature versions (e.g., `1.1.0-feature-name.3`)
  - **hotfix/**: Hotfix versions (e.g., `1.0.1-beta.1`)

#### `.gitattributes` (NEW)
- Ensures proper line ending handling across platforms
- Documents that package.json version is auto-generated

### 2. Scripts

#### `scripts/update-version.js` (NEW)
- Queries GitVersion for the current semantic version
- Updates `package.json` with the calculated version
- Tries multiple GitVersion command variations for compatibility:
  - `gitversion`
  - `dotnet gitversion`
  - `dotnet-gitversion`
- Provides clear error messages if GitVersion is not installed

#### `scripts/show-version.js` (NEW)
- Shows current version from GitVersion without modifying files
- Displays version details (SemVer, FullSemVer, BranchName)
- Useful for checking version before building

### 3. Package.json Updates

Added new npm scripts:

```json
"version": "node scripts/show-version.js"        // Show current version
"update-version": "node scripts/update-version.js"  // Update package.json version
"prebuild": "npm run update-version"             // Auto-update before build
"prepackage": "npm run update-version"           // Auto-update before package
```

**Behavior Changes:**
- `npm run build` now automatically updates version before building
- `npm run package` now automatically updates version before packaging
- `npm run version` shows current GitVersion without making changes
- `npm run update-version` manually updates package.json version

### 4. Documentation

#### `docs/GitVersion-Setup.md` (NEW)
Comprehensive documentation covering:
- Prerequisites and installation
- How GitVersion works with different branches
- Configuration details
- Usage examples
- CI/CD integration examples (GitHub Actions, Azure DevOps)
- Troubleshooting guide
- Version examples for each branch type

#### `README.md` (UPDATED)
- Added GitVersion to prerequisites
- Added installation instructions for GitVersion
- Updated build instructions to mention automatic versioning
- Added link to GitVersion-Setup.md documentation

## How to Use

### View Current Version
```bash
npm run version
```

### Build with Auto-Versioning
```bash
npm run build
```
This will:
1. Query GitVersion for current version
2. Update package.json
3. Run linting
4. Compile TypeScript

### Package Extension
```bash
npm run package
```
This will:
1. Query GitVersion for current version
2. Update package.json
3. Create .vsix file with the correct version

### Manual Version Update
```bash
npm run update-version
```

## Installation Requirements

### Prerequisites
1. .NET Runtime (for GitVersion)
2. GitVersion tool

### Installing GitVersion
```bash
dotnet tool install --global GitVersion.Tool
```

### Verify Installation
```bash
gitversion /version
```

## Version Examples by Branch

| Branch Type | Example Version | Description |
|------------|----------------|-------------|
| master/main | `1.0.0` | Production release |
| develop | `1.1.0-alpha.5` | Development version |
| feature/new-ui | `1.1.0-new-ui.3` | Feature branch |
| release/1.2.0 | `1.2.0-beta.1` | Release candidate |
| hotfix/bug-fix | `1.0.1-beta.1` | Hotfix version |

## Benefits

1. **Automatic Versioning**: No manual version bumps needed
2. **Consistent**: Version always matches Git history
3. **GitFlow Aligned**: Versions reflect branch strategy
4. **CI/CD Ready**: Easy integration with build pipelines
5. **Semantic Versioning**: Follows SemVer 2.0 standard

## Migration Notes

- Existing version in package.json will be overwritten on next build
- If GitVersion is not installed, build will fail with clear instructions
- Version changes are automatically applied during build/package commands
- No changes needed to existing development workflow

## Troubleshooting

If GitVersion is not available:
1. Install it: `dotnet tool install --global GitVersion.Tool`
2. Ensure .NET runtime is installed
3. Check PATH includes dotnet global tools

If you need to build without GitVersion temporarily:
```bash
npm run lint && npm run compile
```

## Files Modified

- `package.json` - Added version scripts
- `README.md` - Updated documentation
- `.gitattributes` - Created for line endings

## Files Created

- `GitVersion.yml` - GitVersion configuration
- `scripts/update-version.js` - Version update script
- `scripts/show-version.js` - Version display script
- `docs/GitVersion-Setup.md` - Detailed documentation
- `docs/CHANGELOG-GitVersion-Integration.md` - This file

## Next Steps

1. Commit these changes to your repository
2. Install GitVersion if not already installed
3. Test build process: `npm run build`
4. Verify version is correctly calculated: `npm run version`
5. Set up CI/CD with GitVersion support (see GitVersion-Setup.md)
