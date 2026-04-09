#!/usr/bin/env node
/**
 * Unified VV environment export orchestrator.
 *
 * Extracts and syncs multiple VV admin components from any environment.
 * Each component is a module in ./components/ with a standard interface.
 * Shares a single browser session across components.
 *
 * Usage:
 *   node tools/export/export.js --project wadnr                  # All components for WADNR
 *   node tools/export/export.js --project demo                   # All components for demo env
 *   node tools/export/export.js --project wadnr --component scripts  # Just web services
 *   node tools/export/export.js --output /path/to/exports        # Custom output + env from .env.json active
 *   node tools/export/export.js --list                           # Show available components
 *   node tools/export/export.js --dry-run                        # List what would be extracted
 *   node tools/export/export.js --force                          # Re-extract everything
 *   node tools/export/export.js --headed                         # Show browser
 *   node tools/export/export.js --filter "Lib*"                  # Filter by name
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
const PROJECT_NAME = getArg('--project');

// Resolve output path and environment from --project or --output
const PROJECTS_DIR = path.resolve(__dirname, '..', '..', 'projects');
const ENV_JSON_PATH = path.resolve(__dirname, '..', '..', '.env.json');

/**
 * Find a customer in .env.json by name (case-insensitive).
 * Returns { server, customer } with the exact key names from .env.json.
 */
function findCustomer(name) {
    const env = JSON.parse(fs.readFileSync(ENV_JSON_PATH, 'utf8'));
    const needle = name.toLowerCase();
    for (const [serverKey, serverObj] of Object.entries(env.servers || {})) {
        for (const customerKey of Object.keys(serverObj.customers || {})) {
            if (customerKey.toLowerCase() === needle) {
                return { server: serverKey, customer: customerKey };
            }
        }
    }
    return null;
}

function resolveProject() {
    if (PROJECT_NAME) {
        // --project <name>: project name = customer name (case-insensitive)
        const match = findCustomer(PROJECT_NAME);
        if (!match) {
            const env = JSON.parse(fs.readFileSync(ENV_JSON_PATH, 'utf8'));
            const available = Object.entries(env.servers || {}).flatMap(([s, obj]) =>
                Object.keys(obj.customers || {}).map((c) => `${s}/${c}`)
            );
            console.error(`No customer "${PROJECT_NAME}" found in .env.json`);
            console.error(`Available: ${available.join(', ')}`);
            process.exit(1);
        }
        return {
            output: getArg('--output') || path.join(PROJECTS_DIR, PROJECT_NAME.toLowerCase(), 'exports'),
            server: match.server,
            customer: match.customer,
        };
    }
    if (getArg('--output')) {
        // Custom output path — use active env from .env.json
        const env = JSON.parse(fs.readFileSync(ENV_JSON_PATH, 'utf8'));
        return {
            output: getArg('--output'),
            server: env.activeServer,
            customer: env.activeCustomer,
        };
    }
    // Default: use active env from .env.json, output to that project folder
    const env = JSON.parse(fs.readFileSync(ENV_JSON_PATH, 'utf8'));
    return {
        output: path.join(PROJECTS_DIR, env.activeCustomer.toLowerCase(), 'exports'),
        server: env.activeServer,
        customer: env.activeCustomer,
    };
}

const PROJECT = resolveProject();
const BASE_OUTPUT = PROJECT.output;

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

    const config = vvAdmin.loadEnvConfig(PROJECT.server, PROJECT.customer);
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

        // Shared context for cross-component routing
        const exportContext = {
            scheduledScriptsDir: path.join(BASE_OUTPUT, 'schedules', 'scripts'),
        };

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
                await runComponent(comp, page, config, outputDir, exportContext);
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

async function runComponent(comp, page, config, outputDir, exportContext) {
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

        // For the scripts component, split items by category so scheduled scripts
        // are tracked in schedules/scripts/ and the rest in web-services/scripts/
        const isScriptsComp = comp.name === 'scripts';
        const nonScheduledItems = isScriptsComp ? allItems.filter((i) => i.categoryCode !== 1) : allItems;
        const scheduledItems = isScriptsComp ? allItems.filter((i) => i.categoryCode === 1) : [];

        const commonOpts = { idField: 'id', dateField: 'modifyDate', fileExt: '.js', force: FORCE, filterFn };

        const changes = vvSync.computeChanges(nonScheduledItems, manifest, {
            ...commonOpts,
            fileDir: path.join(outputDir, 'scripts'),
            component: comp.name,
        });

        // Compute changes for scheduled scripts separately (different output dir)
        if (scheduledItems.length > 0) {
            const schChanges = vvSync.computeChanges(scheduledItems, manifest, {
                ...commonOpts,
                fileDir: exportContext.scheduledScriptsDir,
                component: comp.name,
            });
            changes.toExtract.push(...schChanges.toExtract);
            changes.added += schChanges.added;
            changes.modified += schChanges.modified;
            changes.unchanged += schChanges.unchanged;
            changes.deleted.push(...schChanges.deleted);
        }

        console.log(
            `  Sync: +${changes.added} new, ~${changes.modified} changed, =${changes.unchanged} same, -${changes.deleted.length} deleted`
        );

        if (DRY_RUN) {
            changes.toExtract.forEach((s) => console.log(`    ${s.name}`));
            console.log('  --- DRY RUN ---');
            return;
        }

        // Save manifest — for scripts component, only non-scheduled items
        vvSync.saveManifest(manifestPath, {
            environment: 'vv5dev/WADNR/fpOnline',
            component: comp.name,
            items: nonScheduledItems,
        });

        if (changes.toExtract.length > 0) {
            // Phase 2: Extract
            console.log(`\n  Phase 2: Extracting ${changes.toExtract.length} items...`);
            const extracted = await comp.extract(page, config, changes.toExtract);
            console.log(`  Extracted ${extracted.size}/${changes.toExtract.length}.`);

            // Phase 3: Save (routes scheduled scripts to scheduledScriptsDir)
            const saved = comp.save(outputDir, allItems, extracted, exportContext);
            console.log(`  Saved ${saved} files.`);

            // Handle deletions — resolve path based on category
            for (const s of changes.deleted) {
                const isScheduled = isScriptsComp && s.categoryCode === 1;
                const delDir = isScheduled ? exportContext.scheduledScriptsDir : path.join(outputDir, 'scripts');
                const fp = path.join(delDir, vvSync.sanitizeFilename(s.name) + '.js');
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
            nonScheduledItems.forEach((m) => {
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
