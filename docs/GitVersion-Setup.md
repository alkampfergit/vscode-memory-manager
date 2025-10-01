# GitVersion Setup and Usage

This project uses [GitVersion](https://gitversion.net/) to automatically determine version numbers based on Git history and GitFlow branching strategy.

## Prerequisites

### Install GitVersion

GitVersion requires .NET runtime. Install it as a global tool:

```bash
dotnet tool install --global GitVersion.Tool
```

Or update if already installed:

```bash
dotnet tool update --global GitVersion.Tool
```

Verify installation:

```bash
gitversion /version
```

## How It Works

The version is automatically determined based on your current Git branch and commit history:

- **master/main**: Production releases (e.g., `1.0.0`)
- **develop**: Alpha releases (e.g., `1.1.0-alpha.1`)
- **release/** branches: Beta releases (e.g., `1.1.0-beta.1`)
- **feature/** branches: Feature versions (e.g., `1.1.0-feature-name.1`)
- **hotfix/** branches: Hotfix versions (e.g., `1.0.1-beta.1`)

## Configuration

The GitVersion configuration is in [GitVersion.yml](../GitVersion.yml) in the root directory.

### GitFlow Branch Strategy

The configuration follows GitFlow with these branches:

- `master`: Main production branch
- `develop`: Active development branch
- `feature/*`: Feature branches
- `release/*`: Release preparation branches
- `hotfix/*`: Hotfix branches

## Usage

### Automatic Version Update

The version is automatically updated when you run:

```bash
npm run build
```

or

```bash
npm run package
```

Both commands will:
1. Run `npm run update-version` automatically (via prebuild/prepackage hooks)
2. Query GitVersion for the current version
3. Update `package.json` with the calculated version
4. Continue with the build/package process

### Manual Version Update

You can manually update the version at any time:

```bash
npm run update-version
```

### View Current Version

To see what version GitVersion would calculate:

```bash
gitversion /showvariable SemVer
```

To see all version variables:

```bash
gitversion
```

## Version Examples

### Master Branch
```
Current: 1.0.0
```

### Develop Branch
```
Current: 1.1.0-alpha.5
After merge to master: 1.1.0
```

### Feature Branch (feature/new-ui)
```
Current: 1.1.0-new-ui.3
After merge to develop: 1.1.0-alpha.6
```

### Release Branch (release/1.2.0)
```
Current: 1.2.0-beta.1
After merge to master: 1.2.0
```

### Hotfix Branch (hotfix/critical-fix)
```
Current: 1.0.1-beta.1
After merge to master: 1.0.1
```

## CI/CD Integration

In your CI/CD pipeline, ensure GitVersion is available:

### GitHub Actions
```yaml
- name: Install GitVersion
  uses: gittools/actions/gitversion/setup@v0.10.2
  with:
    versionSpec: '5.x'

- name: Determine Version
  uses: gittools/actions/gitversion/execute@v0.10.2

- name: Build Extension
  run: npm run build
```

### Azure DevOps
```yaml
- task: gitversion/setup@0
  displayName: Install GitVersion
  inputs:
    versionSpec: '5.x'

- task: gitversion/execute@0
  displayName: Determine Version

- script: npm run build
  displayName: Build Extension
```

## Troubleshooting

### GitVersion Not Found

If you get an error that GitVersion is not found:

1. Ensure .NET SDK is installed: `dotnet --version`
2. Install GitVersion: `dotnet tool install --global GitVersion.Tool`
3. Ensure global tools are in PATH: `dotnet tool list -g`

### Version Not Updating

If the version doesn't update:

1. Verify you're in a Git repository: `git status`
2. Check GitVersion can read your repo: `gitversion`
3. Ensure you have commits in your branch
4. Check the GitVersion.yml configuration

### Manual Fallback

If GitVersion is unavailable, you can manually set the version in package.json:

```bash
npm version 1.0.0
```

## References

- [GitVersion Documentation](https://gitversion.net/docs/)
- [GitFlow Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- [Semantic Versioning](https://semver.org/)
