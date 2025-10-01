#!/usr/bin/env node

/**
 * Shows the current version from GitVersion without modifying package.json
 */

const { execSync } = require('child_process');

function showGitVersion() {
    const commands = [
        { cmd: 'gitversion', label: 'GitVersion CLI' },
        { cmd: 'dotnet gitversion', label: 'dotnet gitversion' },
        { cmd: 'dotnet-gitversion', label: 'dotnet-gitversion tool' }
    ];

    console.log('\n🔍 Checking GitVersion installation...\n');

    let found = false;
    for (const { cmd, label } of commands) {
        try {
            const versionOutput = execSync(`${cmd} /showvariable SemVer`, {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();

            if (versionOutput && /^\d+\.\d+\.\d+/.test(versionOutput)) {
                console.log(`✓ ${label} found`);
                console.log(`\n📦 Current Version: ${versionOutput}\n`);

                // Show additional version info
                try {
                    const fullVersion = execSync(`${cmd} /showvariable FullSemVer`, {
                        encoding: 'utf8',
                        stdio: ['pipe', 'pipe', 'pipe']
                    }).trim();

                    const branchName = execSync(`${cmd} /showvariable BranchName`, {
                        encoding: 'utf8',
                        stdio: ['pipe', 'pipe', 'pipe']
                    }).trim();

                    const majorMinorPatch = execSync(`${cmd} /showvariable MajorMinorPatch`, {
                        encoding: 'utf8',
                        stdio: ['pipe', 'pipe', 'pipe']
                    }).trim();

                    console.log('📊 Version Details:');
                    console.log(`   - Simple Version: ${versionOutput}`);
                    console.log(`   - Full Version:   ${fullVersion}`);
                    console.log(`   - Base Version:   ${majorMinorPatch}`);
                    console.log(`   - Branch:         ${branchName}\n`);
                } catch (e) {
                    // Just show basic version if detailed info fails
                }

                found = true;
                break;
            }
        } catch (error) {
            // Try next command
            continue;
        }
    }

    if (!found) {
        console.log('❌ GitVersion not found!\n');
        console.log('Please install GitVersion:');
        console.log('  dotnet tool install --global GitVersion.Tool\n');
        console.log('Or check the documentation:');
        console.log('  docs/GitVersion-Setup.md\n');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    showGitVersion();
}

module.exports = { showGitVersion };
