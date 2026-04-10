#!/usr/bin/env node
/**
 * Unified VV environment extract orchestrator.
 *
 * Extracts and syncs multiple VV admin components from any environment.
 * Each component is a module in ./components/ with a standard interface.
 * Shares a single browser session across components.
 *
 * Usage:
 *   node tools/extract/extract.js --project wadnr                  # All components for WADNR
 *   node tools/extract/extract.js --project demo                   # All components for demo env
 *   node tools/extract/extract.js --project wadnr --component scripts  # Just web services
 *   node tools/extract/extract.js --output /path/to/extracts      # Custom output + env from .env.json active
 *   node tools/extract/extract.js --list                           # Show available components
 *   node tools/extract/extract.js --dry-run                        # List what would be extracted
 *   node tools/extract/extract.js --force                          # Re-extract everything
 *   node tools/extract/extract.js --headed                         # Show browser
 *   node tools/extract/extract.js --filter "Lib*"                  # Filter by name
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
    templates: () => require('./components/templates'),
    queries: () => require('./components/queries'),
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

const { findCustomer } = vvAdmin;

function resolveProject() {
    if (PROJECT_NAME) {
        // --project <name>: project name = customer name (case-insensitive)
        const match = findCustomer(PROJECT_NAME);
        if (!match) {
            console.error(`No customer "${PROJECT_NAME}" found in .env.json`);
            console.error(`Available: ${vvAdmin.listCustomers().join(', ')}`);
            process.exit(1);
        }
        return {
            output: getArg('--output') || path.join(PROJECTS_DIR, PROJECT_NAME.toLowerCase(), 'extracts'),
            server: match.server,
            customer: match.customer,
        };
    }
    const active = vvAdmin.getActiveCustomer();
    if (getArg('--output')) {
        // Custom output path — use active env from .env.json
        return {
            output: getArg('--output'),
            server: active.server,
            customer: active.customer,
        };
    }
    // Default: use active env from .env.json, output to that project folder
    return {
        output: path.join(PROJECTS_DIR, active.customer.toLowerCase(), 'extracts'),
        server: active.server,
        customer: active.customer,
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
    const context = await browser.newContext({ acceptDownloads: true });

    try {
        // Login once
        const loginPage = await context.newPage();
        console.log('Logging in...');
        await vvAdmin.login(loginPage, config);
        console.log('Logged in.\n');
        await loginPage.close();

        // Shared context for cross-component routing
        const extractContext = {
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
                await runComponent(comp, page, config, outputDir, extractContext, context);
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

async function runComponent(comp, page, config, outputDir, extractContext, context) {
    const manifestPath = path.join(outputDir, 'manifest.json');
    const filterFn = (item) => vvSync.matchesFilter(item.name || item[Object.keys(item)[0]], FILTER);

    // Phase 1: Fetch metadata (pass manifestPath for hash carry-forward)
    console.log('\n  Phase 1: Fetching metadata...');
    const allItems = await comp.fetchMetadata(page, config, { manifestPath });
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

        // For the scripts component, items are routed by category:
        //   categoryCode !== 1 → web-services/scripts/
        //   categoryCode === 1 → schedules/scripts/
        // Change detection runs ONCE against the full manifest to avoid
        // double-counting deletions, then toExtract/deleted are split by category.
        const isScriptsComp = comp.name === 'scripts';
        const nonScheduledItems = isScriptsComp ? allItems.filter((i) => i.categoryCode !== 1) : allItems;

        const fileExt = comp.syncOpts?.fileExt || (comp.name === 'templates' ? '.xml' : '.js');
        const contentSubdir = comp.syncOpts?.contentSubdir;
        const fileDir =
            contentSubdir != null
                ? contentSubdir
                    ? path.join(outputDir, contentSubdir)
                    : outputDir
                : comp.name === 'templates'
                  ? outputDir
                  : path.join(outputDir, 'scripts');

        // Run computeChanges once with ALL items against the unified manifest.
        // For scripts: fileDir is null because items route to different dirs by category.
        // Date-based detection still works — only manually-deleted files need --force.
        const changes = vvSync.computeChanges(allItems, manifest, {
            idField: comp.syncOpts?.idField || 'id',
            dateField: comp.syncOpts?.dateField || 'modifyDate',
            hashField: comp.syncOpts?.hashField || null,
            fileExt,
            force: FORCE,
            filterFn,
            fileDir: isScriptsComp ? null : fileDir,
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

        if (changes.toExtract.length > 0) {
            // Phase 2: Extract (pass browser context for parallel workers)
            console.log(`\n  Phase 2: Extracting ${changes.toExtract.length} items...`);
            const extracted = await comp.extract(page, config, changes.toExtract, context);
            console.log(`  Extracted ${extracted.size}/${changes.toExtract.length}.`);

            // Phase 3: Save (routes scheduled scripts to scheduledScriptsDir)
            const saveResult = comp.save(outputDir, allItems, extracted, extractContext);
            const savedCount = typeof saveResult === 'object' ? saveResult.saved : saveResult;
            console.log(`  Saved ${savedCount} files.`);

            // Merge content hashes from extraction into allItems for manifest
            if (typeof saveResult === 'object' && saveResult.hashes) {
                for (const item of allItems) {
                    const hash = saveResult.hashes.get(item.name || item[comp.syncOpts?.idField || 'id']);
                    if (hash) item.contentHash = hash;
                }
            }

            // Handle deletions — resolve path based on category (check both dirs for scripts)
            for (const s of changes.deleted) {
                const dirs = isScriptsComp ? [fileDir, extractContext.scheduledScriptsDir] : [fileDir];
                for (const dir of dirs) {
                    const fp = path.join(dir, vvSync.sanitizeFilename(s.name) + fileExt);
                    if (fs.existsSync(fp)) {
                        fs.unlinkSync(fp);
                        console.log(`  Removed: ${s.name}`);
                        break;
                    }
                }
            }

            const missing = changes.toExtract.filter((s) => !extracted.has(s.name));
            if (missing.length > 0) {
                console.log(`  WARN: ${missing.length} not extracted: ${missing.map((s) => s.name).join(', ')}`);
            }
        } else {
            console.log('  All up to date.');
        }

        // Save manifest AFTER extraction so content hashes are included.
        // For scripts: save ALL items (scheduled + non-scheduled) so both are tracked.
        vvSync.saveManifest(manifestPath, {
            environment: `${PROJECT.server}/${PROJECT.customer}`,
            component: comp.name,
            items: allItems,
        });

        // Generate README with full set of extracted files
        const allExtracted = new Set();
        const scanDir =
            contentSubdir != null
                ? contentSubdir
                    ? path.join(outputDir, contentSubdir)
                    : outputDir
                : comp.name === 'templates'
                  ? outputDir
                  : path.join(outputDir, 'scripts');
        if (fs.existsSync(scanDir)) {
            nonScheduledItems.forEach((m) => {
                if (fs.existsSync(path.join(scanDir, vvSync.sanitizeFilename(m.name) + fileExt))) {
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
