#!/usr/bin/env node
/**
 * Export WADNR web service scripts (outsideprocessadmin) via API + Playwright.
 *
 * Phase 1 (API):        Get metadata for all registered microservices (fast)
 * Phase 2 (Playwright): Extract script source from admin dock panels
 *
 * Sync: compares API modifyDate with local manifest. Only re-extracts new/changed.
 * Uses shared helpers from testing/helpers/vv-admin.js.
 *
 * Usage:
 *   node testing/scripts/export-wadnr-scripts.js                  # Full extraction
 *   node testing/scripts/export-wadnr-scripts.js --dry-run         # List only
 *   node testing/scripts/export-wadnr-scripts.js --force           # Re-extract all
 *   node testing/scripts/export-wadnr-scripts.js --filter "Lib*"   # Only matching
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vvAdmin = require('../helpers/vv-admin');

// --- Config ---

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'tasks', 'date-handling', 'wadnr-impact', 'web-services');
const SCRIPTS_DIR = path.join(OUTPUT_DIR, 'scripts');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');
const CATEGORY_MAP = { 0: 'Form', 1: 'Scheduled', 5: 'Workflow' };
const TEXTAREA_ID = 'ctl00_ContentBody_dockDetail_C_txtScriptCode';

// --- CLI ---

const cliArgs = process.argv.slice(2);
const DRY_RUN = cliArgs.includes('--dry-run');
const FORCE = cliArgs.includes('--force');
const HEADLESS = !cliArgs.includes('--headed');
const FILTER = (() => {
    const i = cliArgs.indexOf('--filter');
    return i !== -1 && i + 1 < cliArgs.length ? cliArgs[i + 1] : null;
})();

function sanitize(name) {
    return name.replace(/[^a-zA-Z0-9_\-. ]/g, '_').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

function matchesFilter(name) {
    if (!FILTER) return true;
    const p = FILTER.replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(`^${p}$`, 'i').test(name);
}

// =============================================================================
// Phase 1: API metadata
// =============================================================================

async function fetchMetadata(config) {
    const clientLib = require(path.join(__dirname, '..', '..', 'lib', 'VVRestApi', 'VVRestApiNodeJs', 'VVRestApi'));
    const auth = new clientLib.authorize();
    auth.readOnly = true;
    const vv = await auth.getVaultApi(
        config.clientId, config.clientSecret, config.username, config.password,
        config.audience, config.baseUrl, config.customerAlias, config.databaseAlias
    );
    const res = await vv.outsideProcesses.getOutsideProcesses();
    const parsed = typeof res === 'string' ? JSON.parse(res) : res;
    const items = parsed.data || parsed;
    if (!Array.isArray(items)) throw new Error('Bad API response');

    return items.map(i => ({
        id: i.id, name: i.name, description: i.description || '',
        category: CATEGORY_MAP[i.processCategory] || `Unknown(${i.processCategory})`,
        categoryCode: i.processCategory,
        modifyDate: i.modifyDate, modifyBy: i.modifyBy,
        createDate: i.createDate, createBy: i.createBy,
    })).sort((a, b) => a.name.localeCompare(b.name));
}

// =============================================================================
// Sync
// =============================================================================

function loadManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) return null;
    try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch { return null; }
}

function computeChanges(all, manifest) {
    const filtered = all.filter(s => matchesFilter(s.name));
    if (!manifest || FORCE) {
        return { toExtract: filtered, added: filtered.length, modified: 0, unchanged: 0, deleted: [] };
    }
    const existMap = new Map(manifest.scripts.map(s => [s.id, s]));
    const toExtract = [];
    let added = 0, modified = 0, unchanged = 0;
    for (const s of filtered) {
        const ex = existMap.get(s.id);
        const fp = path.join(SCRIPTS_DIR, sanitize(s.name) + '.js');
        if (!ex || !fs.existsSync(fp)) { toExtract.push(s); added++; }
        else if (ex.modifyDate !== s.modifyDate) { toExtract.push(s); modified++; }
        else { unchanged++; }
    }
    const apiIds = new Set(all.map(s => s.id));
    const deleted = manifest.scripts.filter(s => !apiIds.has(s.id));
    return { toExtract, added, modified, unchanged, deleted };
}

// =============================================================================
// Phase 2: Playwright extraction
// =============================================================================

async function extractScripts(config, scriptsToExtract) {
    const browser = await chromium.launch({ headless: HEADLESS });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const results = new Map();
    const targetNames = new Set(scriptsToExtract.map(s => s.name));

    try {
        await vvAdmin.login(page, config);
        const url = vvAdmin.adminUrl(config, 'outsideprocessadmin');
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('#ctl00_ContentBody_DG1_ctl00', { timeout: 30000 });

        const info = await vvAdmin.getGridInfo(page);
        console.log(`  Grid: ${info}`);

        let pageNum = 0;
        while (pageNum < 30 && results.size < targetNames.size) {
            pageNum++;
            const links = await vvAdmin.getGridDetailLinks(page);
            const needed = links.filter(l => targetNames.has(l.name) && !results.has(l.name));
            console.log(`  Page ${pageNum}: ${links.length} scripts, ${needed.length} to extract`);

            for (const link of needed) {
                process.stdout.write(`    ${link.name}...`);
                const data = await vvAdmin.extractDockPanelDetail(
                    page, link.linkId, TEXTAREA_ID, 'outsideprocessadmin', {
                        extraFields: { scriptId: '[id*="lblScriptId"]' },
                    }
                );

                if (data && data.source !== null) {
                    results.set(link.name, data);
                    process.stdout.write(` OK (${(data.source.length / 1024).toFixed(1)} KB)\n`);
                } else {
                    process.stdout.write(` SKIP\n`);
                }
            }

            if (results.size >= targetNames.size) break;

            const advanced = await vvAdmin.goToNextGridPage(page, pageNum, 'outsideprocessadmin');
            if (!advanced) { console.log('  No more pages.'); break; }
        }
    } finally {
        await browser.close();
    }
    return results;
}

// =============================================================================
// Save
// =============================================================================

function saveScripts(all, extracted) {
    fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
    const today = new Date().toISOString().split('T')[0];
    let saved = 0;
    for (const [name, data] of extracted) {
        const meta = all.find(m => m.name === name);
        const fn = sanitize(name) + '.js';
        const hdr = [
            '/**',
            ` * ${name}`,
            meta ? ` * Category: ${meta.category}` : '',
            meta ? ` * Modified: ${meta.modifyDate} by ${meta.modifyBy}` : '',
            data.scriptId ? ` * Script ID: ${data.scriptId}` : '',
            ` * Extracted from WADNR (vv5dev/fpOnline) on ${today}`,
            ' */', '',
        ].filter(l => l !== '').join('\n');
        fs.writeFileSync(path.join(SCRIPTS_DIR, fn), hdr + data.source + '\n', 'utf8');
        saved++;
    }
    return saved;
}

function saveManifest(all) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify({
        generatedAt: new Date().toISOString(),
        environment: 'vv5dev/WADNR/fpOnline',
        totalScripts: all.length,
        scripts: all,
    }, null, 2) + '\n', 'utf8');
}

function generateReadme(all, extractedNames) {
    const today = new Date().toISOString().split('T')[0];
    const lines = ['# WADNR Web Services', '', `Extracted from outsideprocessadmin on vv5dev (WADNR/fpOnline). Generated: ${today}`, ''];
    const byCat = {};
    for (const m of all) { (byCat[m.category] = byCat[m.category] || []).push(m); }
    for (const [cat, scripts] of Object.entries(byCat).sort()) {
        lines.push(`## ${cat} (${scripts.length})`, '', '| # | Service Name | Description | Modified | Src |', '| --: | :--- | :--- | :--- | :---: |');
        scripts.sort((a, b) => a.name.localeCompare(b.name));
        scripts.forEach((s, i) => {
            const fn = sanitize(s.name) + '.js';
            const has = extractedNames.has(s.name);
            const mod = s.modifyDate ? s.modifyDate.split('T')[0] : '';
            const desc = (s.description || '').substring(0, 60);
            lines.push(`| ${i + 1} | ${has ? `[${s.name}](./scripts/${fn})` : s.name} | ${desc} | ${mod} | ${has ? 'Y' : '-'} |`);
        });
        lines.push('');
    }
    lines.push(`**Total**: ${all.length} scripts`, '');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), lines.join('\n'), 'utf8');
}

// =============================================================================
// Main
// =============================================================================

async function main() {
    const config = vvAdmin.loadEnvConfig('vv5dev', 'WADNR');
    console.log(`Target: ${config.baseUrl} (${config.customerAlias}/${config.databaseAlias})`);
    console.log(`Output: ${OUTPUT_DIR}`);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Phase 1
    console.log('\n=== Phase 1: API metadata ===');
    const all = await fetchMetadata(config);
    console.log(`Found ${all.length} microservices.`);

    const manifest = loadManifest();
    const ch = computeChanges(all, manifest);
    console.log(`Sync: +${ch.added} new, ~${ch.modified} changed, =${ch.unchanged} same, -${ch.deleted.length} deleted → ${ch.toExtract.length} to extract`);

    if (DRY_RUN) {
        ch.toExtract.forEach(s => console.log(`  [${s.category}] ${s.name}`));
        console.log('--- DRY RUN ---');
        return;
    }

    saveManifest(all);

    if (ch.toExtract.length === 0) {
        console.log('All up to date.');
        const existing = new Set();
        if (fs.existsSync(SCRIPTS_DIR)) all.forEach(m => { if (fs.existsSync(path.join(SCRIPTS_DIR, sanitize(m.name) + '.js'))) existing.add(m.name); });
        generateReadme(all, existing);
        return;
    }

    // Phase 2
    console.log(`\n=== Phase 2: Playwright extraction (${ch.toExtract.length} scripts) ===`);
    const extracted = await extractScripts(config, ch.toExtract);
    console.log(`\nExtracted ${extracted.size}/${ch.toExtract.length}.`);

    const saved = saveScripts(all, extracted);
    console.log(`Saved ${saved} files.`);

    // Build full set
    const allNames = new Set(extracted.keys());
    if (fs.existsSync(SCRIPTS_DIR)) all.forEach(m => { if (fs.existsSync(path.join(SCRIPTS_DIR, sanitize(m.name) + '.js'))) allNames.add(m.name); });
    generateReadme(all, allNames);

    // Deletions
    for (const s of ch.deleted) {
        const fp = path.join(SCRIPTS_DIR, sanitize(s.name) + '.js');
        if (fs.existsSync(fp)) { console.log(`  Removed: ${s.name}`); fs.unlinkSync(fp); }
    }

    const missing = ch.toExtract.filter(s => !extracted.has(s.name));
    if (missing.length > 0) console.log(`\nWARN: ${missing.length} not extracted: ${missing.map(s => s.name).join(', ')}`);
    console.log(`\nDone. ${allNames.size}/${all.length} scripts.`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
