#!/usr/bin/env node
/**
 * Run Playwright regression tests and generate/update test artifacts.
 *
 * Orchestrates: npx playwright test → regression-reporter.js → generate-artifacts.js
 *
 * Usage:
 *   node testing/scripts/run-regression.js --browser firefox
 *   node testing/scripts/run-regression.js --project 'BRT-firefox'
 *   node testing/scripts/run-regression.js --browser chromium --tz IST
 *   node testing/scripts/run-regression.js --artifacts-only          # artifacts from last results only
 *   node testing/scripts/run-regression.js --skip-artifacts    # run tests only
 *   node testing/scripts/run-regression.js --headed            # visible browser
 *
 * npm script: npm run test:pw:regression -- --browser firefox
 */
const { execSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(REPO_ROOT, 'testing', 'playwright.config.js');
const REPORTER_PATH = path.join(REPO_ROOT, 'testing', 'reporters', 'regression-reporter.js');
const GENERATOR_PATH = path.join(REPO_ROOT, 'testing', 'scripts', 'generate-artifacts.js');

function main() {
    const args = process.argv.slice(2);

    const dryRun = args.includes('--artifacts-only');
    const skipArtifacts = args.includes('--skip-artifacts');
    const headed = args.includes('--headed');

    // Parse --browser and --tz flags
    const browserIdx = args.indexOf('--browser');
    const browser = browserIdx >= 0 ? args[browserIdx + 1] : null;

    const tzIdx = args.indexOf('--tz');
    const tz = tzIdx >= 0 ? args[tzIdx + 1] : null;

    const projectIdx = args.indexOf('--project');
    let project = projectIdx >= 0 ? args[projectIdx + 1] : null;

    // Build project filter from --browser and --tz
    if (!project && browser && tz) {
        project = `${tz}-${browser}`;
    } else if (!project && browser) {
        project = `*-${browser}`;
    } else if (!project && tz) {
        project = `${tz}-*`;
    }

    if (!dryRun) {
        if (!project) {
            console.error('Error: specify --browser, --tz, or --project to select which tests to run.');
            console.error('Examples:');
            console.error('  node testing/scripts/run-regression.js --browser firefox');
            console.error('  node testing/scripts/run-regression.js --project BRT-chromium');
            console.error('  node testing/scripts/run-regression.js --browser webkit --tz IST');
            process.exit(1);
        }

        // Phase 1: Run Playwright tests with custom reporter
        console.log(`\n=== Phase 1: Running regression tests (project: ${project}) ===\n`);

        const pwArgs = [
            `npx playwright test`,
            `--config=${CONFIG_PATH}`,
            `--project='${project}'`,
            `--reporter=${REPORTER_PATH},list`,
        ];
        if (headed) pwArgs.push('--headed');

        const cmd = pwArgs.join(' ');
        console.log(`> ${cmd}\n`);

        try {
            execSync(cmd, {
                cwd: REPO_ROOT,
                stdio: 'inherit',
                timeout: 30 * 60 * 1000, // 30 min max
            });
        } catch (err) {
            // Playwright exits non-zero when tests fail — this is expected for known bugs
            if (err.status === null) {
                console.error('\nPlaywright process was killed (timeout or signal)');
                process.exit(1);
            }
            console.log(`\nPlaywright exited with code ${err.status} (expected for known-bug failures)`);
        }
    }

    if (skipArtifacts) {
        console.log('\n--skip-artifacts: skipping artifact generation');
        return;
    }

    // Phase 2: Generate artifacts
    console.log('\n=== Phase 2: Generating artifacts ===\n');

    const genArgs = ['node', GENERATOR_PATH];

    try {
        execSync(genArgs.join(' '), {
            cwd: REPO_ROOT,
            stdio: 'inherit',
        });
    } catch (err) {
        console.error('Artifact generation failed:', err.message);
        process.exit(1);
    }

    console.log('\n=== Done ===');
}

main();
