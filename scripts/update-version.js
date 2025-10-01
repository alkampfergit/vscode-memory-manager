#!/usr/bin/env node

/**
 * Updates package.json version using GitVersion
 * Requires GitVersion to be installed (dotnet tool install --global GitVersion.Tool)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Try both gitversion and dotnet gitversion commands
function getGitVersion() {
    const commands = [
        'gitversion /showvariable SemVer',
        'dotnet gitversion /showvariable SemVer',
        'dotnet-gitversion /showvariable SemVer'
    ];

    for (const cmd of commands) {
        try {
            const version = execSync(cmd, {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();

            if (version && /^\d+\.\d+\.\d+/.test(version)) {
                console.log(`✓ GitVersion detected using: ${cmd.split(' ')[0]}`);
                return version;
            }
        } catch (error) {
            // Try next command
            continue;
        }
    }

    throw new Error('GitVersion not found. Please install it:\n  dotnet tool install --global GitVersion.Tool');
}

function updatePackageVersion() {
    try {
        // Get version from GitVersion
        const version = getGitVersion();
        console.log(`📦 Version from GitVersion: ${version}`);

        // Read package.json
        const packagePath = path.join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        // Update version
        const oldVersion = packageJson.version;
        packageJson.version = version;

        // Write back to package.json
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

        console.log(`✓ Updated package.json version: ${oldVersion} → ${version}`);

        return version;
    } catch (error) {
        console.error('❌ Error updating version:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    updatePackageVersion();
}

module.exports = { updatePackageVersion, getGitVersion };
