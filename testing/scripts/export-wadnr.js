#!/usr/bin/env node
/**
 * Unified WADNR export orchestrator.
 *
 * Extracts and syncs multiple VV admin components from the WADNR environment.
 * Each component is a module in ./components/ with a standard interface.
 * Shares a single browser session across components.
 *
 * Usage:
 *   node testing/scripts/export-wadnr.js                       # All components
 *   node testing/scripts/export-wadnr.js --component scripts   # Just web services
 *   node testing/scripts/export-wadnr.js --component schedules # Just scheduled services
 *   node testing/scripts/export-wadnr.js --component globals   # Just global functions
 *   node testing/scripts/export-wadnr.js --list                # Show available components
 *   node testing/scripts/export-wadnr.js --dry-run             # List what would be extracted
 *   node testing/scripts/export-wadnr.js --force               # Re-extract everything
 *   node testing/scripts/export-wadnr.js --headed              # Show browser
 *   node testing/scripts/export-wadnr.js --filter "Lib*"       # Filter by name
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vvAdmin = require('../helpers/vv-admin');
const vvSync = require('../helpers/vv-sync');

// --- Available components ---

const COMPONENT_REGISTRY = {
    scripts: () => require('./components/scripts'),
    schedules: () => require('./components/schedules'),
    globals: () => require('./components/globals'),
};

// --- CLI ---

const cliArgs = process.argv.slice(2);
const DRY_RUN = cliArgs.includes('--dry-run');
const FORCE = cliArgs.includes('--force');
const HEADLESS = !cliArgs.includes('--headed');
const LIST = cliArgs.includes('--list');

function getArg(flag) {
    const i = cliArgs.indexOf(flag);
    return i !== -1 && i + 1 < cliArgs.length ? cliArgs[i + 1] : null;
}

const COMPONENT_NAME = getArg('--component');
const FILTER = getArg('--filter');

const BASE_OUTPUT = path.resolve(__dirname, '..', '..', 'tasks', 'date-handling', 'wadnr-impact');

// --- Main ---

async function main() {
    if (LIST) {
        console.log('Available components:');
        for (const name of Object.keys(COMPONENT_REGISTRY)) {
            console.log(`  ${name}`);
        }
        return;
    }

    // Determine which components to run
    let componentNames;
    if (COMPONENT_NAME) {
        if (!COMPONENT_REGISTRY[COMPONENT_NAME]) {
            console.error(`Unknown component: ${COMPONENT_NAME}`);
            console.error(`Available: ${Object.keys(COMPONENT_REGISTRY).join(', ')}`);
            process.exit(1);
        }
        componentNames = [COMPONENT_NAME];
    } else {
        componentNames = Object.keys(COMPONENT_REGISTRY);
    }

    const config = vvAdmin.loadEnvConfig('vv5dev', 'WADNR');
    console.log(`Target: ${config.baseUrl} (${config.customerAlias}/${config.databaseAlias})`);
    console.log(`Components: ${componentNames.join(', ')}`);
    console.log(
        `Flags: ${DRY_RUN ? 'DRY_RUN ' : ''}${FORCE ? 'FORCE ' : ''}${FILTER ? 'FILTER=' + FILTER + ' ' : ''}${HEADLESS ? 'headless' : 'headed'}\n`
    );

    // Launch browser once for all components
    const browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext();

    try {
        // Login once
        const loginPage = await context.newPage();
        console.log('Logging in...');
        await vvAdmin.login(loginPage, config);
        console.log('Logged in.\n');
        await loginPage.close();

        // Run each component
        for (const compName of componentNames) {
            console.log(`${'='.repeat(60)}`);
            console.log(`Component: ${compName}`);
            console.log(`${'='.repeat(60)}`);

            const comp = COMPONENT_REGISTRY[compName]();
            const outputDir = path.join(BASE_OUTPUT, comp.outputSubdir);
            fs.mkdirSync(outputDir, { recursive: true });

            const page = await context.newPage();

            try {
                await runComponent(comp, page, config, outputDir);
            } catch (err) {
                console.error(`\n  ERROR in ${compName}: ${err.message}`);
                const screenshot = path.join(outputDir, '_error-screenshot.png');
                await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
            } finally {
                await page.close();
            }

            console.log('');
        }
    } finally {
        await browser.close();
    }

    console.log('All done.');
}

async function runComponent(comp, page, config, outputDir) {
    const manifestPath = path.join(outputDir, 'manifest.json');
    const filterFn = (item) => vvSync.matchesFilter(item.name || item[Object.keys(item)[0]], FILTER);

    // Phase 1: Fetch metadata
    console.log('\n  Phase 1: Fetching metadata...');
    const allItems = await comp.fetchMetadata(page, config);
    console.log(`  Found ${allItems.length} items.`);

    if (DRY_RUN && !comp.extract) {
        // Metadata-only component — just show what was found
        const filtered = allItems.filter(filterFn);
        console.log(`\n  Items (${filtered.length}):`);
        filtered.forEach((item) => {
            const name = item.name || JSON.stringify(item).substring(0, 60);
            console.log(`    ${name}`);
        });
        console.log('  --- DRY RUN ---');
        return;
    }

    // Sync analysis (only for components with extract phase)
    if (comp.extract) {
        const manifest = vvSync.loadManifest(manifestPath);
        const changes = vvSync.computeChanges(allItems, manifest, {
            idField: 'id',
            dateField: 'modifyDate',
            fileDir: path.join(outputDir, 'scripts'),
            fileExt: '.js',
            force: FORCE,
            filterFn,
            component: comp.name,
        });
        console.log(
            `  Sync: +${changes.added} new, ~${changes.modified} changed, =${changes.unchanged} same, -${changes.deleted.length} deleted`
        );

        if (DRY_RUN) {
            changes.toExtract.forEach((s) => console.log(`    ${s.name}`));
            console.log('  --- DRY RUN ---');
            return;
        }

        // Save manifest (always, with full data)
        vvSync.saveManifest(manifestPath, {
            environment: 'vv5dev/WADNR/fpOnline',
            component: comp.name,
            items: allItems,
        });

        if (changes.toExtract.length > 0) {
            // Phase 2: Extract
            console.log(`\n  Phase 2: Extracting ${changes.toExtract.length} items...`);
            const extracted = await comp.extract(page, config, changes.toExtract);
            console.log(`  Extracted ${extracted.size}/${changes.toExtract.length}.`);

            // Phase 3: Save
            const saved = comp.save(outputDir, allItems, extracted);
            console.log(`  Saved ${saved} files.`);

            // Handle deletions
            for (const s of changes.deleted) {
                const fp = path.join(outputDir, 'scripts', vvSync.sanitizeFilename(s.name) + '.js');
                if (fs.existsSync(fp)) {
                    fs.unlinkSync(fp);
                    console.log(`  Removed: ${s.name}`);
                }
            }

            const missing = changes.toExtract.filter((s) => !extracted.has(s.name));
            if (missing.length > 0) {
                console.log(`  WARN: ${missing.length} not extracted: ${missing.map((s) => s.name).join(', ')}`);
            }
        } else {
            console.log('  All up to date.');
        }

        // Generate README with full set of extracted files
        const allExtracted = new Set();
        const scriptsDir = path.join(outputDir, 'scripts');
        if (fs.existsSync(scriptsDir)) {
            allItems.forEach((m) => {
                if (fs.existsSync(path.join(scriptsDir, vvSync.sanitizeFilename(m.name) + '.js'))) {
                    allExtracted.add(m.name);
                }
            });
        }
        comp.generateReadme(outputDir, allItems, allExtracted);
    } else {
        // Metadata-only component (e.g., schedules, globals)
        if (DRY_RUN) {
            console.log('  --- DRY RUN ---');
            return;
        }

        const saved = comp.save(outputDir, allItems);
        console.log(`  Saved ${saved} items.`);
        comp.generateReadme(outputDir, allItems);
    }

    console.log(`  Output: ${outputDir}`);
}

main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
