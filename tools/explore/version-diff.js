#!/usr/bin/env node
/**
 * VV Platform Version Diff
 *
 * Compares two version snapshots and reports what changed.
 * Useful after receiving a deploy notification to see what's different.
 *
 * Usage:
 *   node tools/explore/version-diff.js                           # compare latest vs previous
 *   node tools/explore/version-diff.js <before.json> <after.json> # compare two specific snapshots
 *   node tools/explore/version-diff.js --list                    # list available snapshots
 */
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../../testing/fixtures/env-config');

const args = process.argv.slice(2);
const config = loadConfig();
const ENV_NAME = config.instance.replace('/', '-');
const SNAPSHOTS_DIR = path.join(__dirname, 'snapshots');

// --- List mode ---

if (args.includes('--list')) {
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
        console.log('No snapshots directory found. Run version-snapshot.js first.');
        process.exit(0);
    }
    const files = fs
        .readdirSync(SNAPSHOTS_DIR)
        .filter((f) => f.startsWith('version-') && f.endsWith('.json') && !f.includes('-latest'))
        .sort();

    if (files.length === 0) {
        console.log('No snapshots found. Run version-snapshot.js first.');
    } else {
        console.log(`\nAvailable snapshots in ${SNAPSHOTS_DIR}:\n`);
        for (const f of files) {
            const data = JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, f), 'utf8'));
            const ts = data.meta?.timestamp || '(unknown)';
            const build = data.formViewer?.buildNumber || '?';
            const prog = data.platform?.progVersion || '?';
            console.log(`  ${f}`);
            console.log(`    ${ts}  |  platform: ${prog}  |  FormViewer: ${build}`);
        }
        console.log();
    }
    process.exit(0);
}

// --- Diff mode ---

function loadSnapshot(filepath) {
    if (!fs.existsSync(filepath)) {
        console.error(`File not found: ${filepath}`);
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function findTwoMostRecent() {
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
        console.error('No snapshots directory. Run version-snapshot.js first.');
        process.exit(1);
    }

    const files = fs
        .readdirSync(SNAPSHOTS_DIR)
        .filter((f) => f.startsWith(`version-${ENV_NAME}`) && f.endsWith('.json') && !f.includes('-latest'))
        .sort();

    if (files.length < 2) {
        console.error(
            `Need at least 2 snapshots to diff. Found ${files.length}. Run version-snapshot.js again after a deploy.`
        );
        process.exit(1);
    }

    return [path.join(SNAPSHOTS_DIR, files[files.length - 2]), path.join(SNAPSHOTS_DIR, files[files.length - 1])];
}

function diff(before, after) {
    const changes = [];
    const unchanged = [];

    // Platform version
    if (before.platform?.progVersion !== after.platform?.progVersion) {
        changes.push({
            component: 'Platform',
            field: 'progVersion',
            before: before.platform?.progVersion,
            after: after.platform?.progVersion,
        });
    } else {
        unchanged.push(`Platform progVersion: ${after.platform?.progVersion}`);
    }

    // DB version
    if (before.platform?.dbVersion !== after.platform?.dbVersion) {
        changes.push({
            component: 'Platform',
            field: 'dbVersion',
            before: before.platform?.dbVersion,
            after: after.platform?.dbVersion,
        });
    } else {
        unchanged.push(`Platform dbVersion: ${after.platform?.dbVersion}`);
    }

    // FormViewer build
    if (before.formViewer?.buildNumber !== after.formViewer?.buildNumber) {
        changes.push({
            component: 'FormViewer',
            field: 'buildNumber',
            before: before.formViewer?.buildNumber,
            after: after.formViewer?.buildNumber,
        });
    } else {
        unchanged.push(`FormViewer build: ${after.formViewer?.buildNumber}`);
    }

    // FormViewer code version
    if (before.formViewer?.codeVersion !== after.formViewer?.codeVersion) {
        changes.push({
            component: 'FormViewer',
            field: 'codeVersion',
            before: before.formViewer?.codeVersion,
            after: after.formViewer?.codeVersion,
        });
    } else if (after.formViewer?.codeVersion) {
        unchanged.push(`FormViewer code: ${after.formViewer?.codeVersion}`);
    }

    // Data type count (schema changes)
    if (before.platform?.dataTypeCount !== after.platform?.dataTypeCount) {
        changes.push({
            component: 'Platform',
            field: 'dataTypeCount',
            before: String(before.platform?.dataTypeCount),
            after: String(after.platform?.dataTypeCount),
        });
    }

    // FormViewer script hashes (legacy snapshots only)
    const beforeScripts = new Set(before.formViewer?.scriptFiles || []);
    const afterScripts = new Set(after.formViewer?.scriptFiles || []);

    if (beforeScripts.size > 0 || afterScripts.size > 0) {
        const addedScripts = [...afterScripts].filter((s) => !beforeScripts.has(s));
        const removedScripts = [...beforeScripts].filter((s) => !afterScripts.has(s));

        if (addedScripts.length > 0 || removedScripts.length > 0) {
            const getBase = (filename) => filename.replace(/\.[a-f0-9]{12,}\.js$/, '.js');
            const beforeMap = {};
            const afterMap = {};
            for (const s of beforeScripts) beforeMap[getBase(s)] = s;
            for (const s of afterScripts) afterMap[getBase(s)] = s;

            for (const base of new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)])) {
                if (beforeMap[base] !== afterMap[base]) {
                    changes.push({
                        component: 'FormViewer',
                        field: `script:${base}`,
                        before: beforeMap[base] || '(new)',
                        after: afterMap[base] || '(removed)',
                    });
                }
            }
        }
    }

    // Server headers
    const allHeaders = new Set([...Object.keys(before.server || {}), ...Object.keys(after.server || {})]);
    for (const header of allHeaders) {
        const bVal = before.server?.[header];
        const aVal = after.server?.[header];
        if (bVal !== aVal) {
            changes.push({ component: 'Server', field: header, before: bVal, after: aVal });
        }
    }

    // Service URLs and enabled status
    const allServices = new Set([...Object.keys(before.services || {}), ...Object.keys(after.services || {})]);
    for (const svc of allServices) {
        const bSvc = before.services?.[svc] || {};
        const aSvc = after.services?.[svc] || {};

        if (bSvc.url !== aSvc.url) {
            changes.push({ component: `Service:${svc}`, field: 'url', before: bSvc.url, after: aSvc.url });
        }
        if (bSvc.isEnabled !== aSvc.isEnabled) {
            changes.push({
                component: `Service:${svc}`,
                field: 'isEnabled',
                before: String(bSvc.isEnabled),
                after: String(aSvc.isEnabled),
            });
        }
    }

    return { changes, unchanged };
}

// Resolve file paths
let beforePath, afterPath;
if (args.length >= 2 && !args[0].startsWith('--')) {
    beforePath = path.resolve(args[0]);
    afterPath = path.resolve(args[1]);
} else {
    [beforePath, afterPath] = findTwoMostRecent();
}

const before = loadSnapshot(beforePath);
const after = loadSnapshot(afterPath);

const { changes, unchanged } = diff(before, after);

// Print report
const divider = '═'.repeat(70);
console.log();
console.log(divider);
console.log(`  VV Version Diff — ${after.meta?.instance || ENV_NAME}`);
console.log(divider);
console.log(`  Before: ${before.meta?.timestamp}  (${path.basename(beforePath)})`);
console.log(`  After:  ${after.meta?.timestamp}  (${path.basename(afterPath)})`);
console.log(divider);

if (changes.length === 0) {
    console.log();
    console.log('  No changes detected.');
    console.log();
} else {
    console.log();
    console.log(`  ${changes.length} change(s) detected:`);
    console.log();
    for (const c of changes) {
        console.log(`  [${c.component}] ${c.field}`);
        console.log(`    before: ${c.before || '(none)'}`);
        console.log(`    after:  ${c.after || '(none)'}`);
        console.log();
    }
}

if (unchanged.length > 0) {
    console.log('  Unchanged:');
    for (const u of unchanged) {
        console.log(`    ${u}`);
    }
    console.log();
}

console.log(divider);
console.log();
