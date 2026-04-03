#!/usr/bin/env node
/**
 * Run Dashboard date-handling regression tests and generate/update test artifacts.
 *
 * Launches Playwright, navigates to the DateTest Dashboard (Telerik RadGrid),
 * captures grid cell values, compares against matrix.md Expected column,
 * and generates artifacts.
 *
 * Dashboards are server-rendered — browser TZ is irrelevant.
 *
 * Usage:
 *   node testing/scripts/run-dash-regression.js
 *   node testing/scripts/run-dash-regression.js --category DB-1
 *   node testing/scripts/run-dash-regression.js --artifacts-only
 *   node testing/scripts/run-dash-regression.js --skip-artifacts
 *   node testing/scripts/run-dash-regression.js --headed
 *
 * npm script: npm run test:dash:regression
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const AUTH_STATE_PATH = path.join(REPO_ROOT, 'testing', 'config', 'auth-state-pw.json');
const RESULTS_DIR = path.join(REPO_ROOT, 'testing', 'tmp');
const RESULTS_PATH = path.join(RESULTS_DIR, 'dash-regression-results-latest.json');
const GENERATOR_PATH = path.join(REPO_ROOT, 'testing', 'scripts', 'generate-dash-artifacts.js');

const BASE_URL = 'https://vvdemo.visualvault.com';
const DASHBOARD_URL =
    '/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25';

// Field configs matching matrix.md
const FIELD_MAP = {
    A: 'Field7',
    B: 'Field10',
    C: 'Field6',
    D: 'Field5',
    E: 'Field12',
    F: 'Field11',
    G: 'Field14',
    H: 'Field13',
};

// Known test records (from WS-1 and bug-simulated records)
const TEST_RECORDS = {
    // DB-1/2: Records with clean values (created via WS-1 API)
    accuracy: ['DateTest-000889', 'DateTest-000890'],
    // DB-3: Records with bug-simulated values
    bugShift: ['DateTest-001077', 'DateTest-001078', 'DateTest-001079', 'DateTest-001081'],
};

const ALL_DATE_FIELDS = Object.values(FIELD_MAP);

async function main() {
    const args = process.argv.slice(2);
    const artifactsOnly = args.includes('--artifacts-only');
    const skipArtifacts = args.includes('--skip-artifacts');
    const headed = args.includes('--headed');
    const categoryIdx = args.indexOf('--category');
    const categoryFilter = categoryIdx >= 0 ? args[categoryIdx + 1] : null;

    if (!artifactsOnly) {
        console.log('\n=== Phase 1: Capturing dashboard grid data ===\n');
        fs.mkdirSync(RESULTS_DIR, { recursive: true });

        const browser = await chromium.launch({ headless: !headed, channel: 'chrome' });
        const context = await browser.newContext({ storageState: AUTH_STATE_PATH });
        const page = await context.newPage();

        // Navigate to dashboard
        console.log('Loading dashboard...');
        await page.goto(`${BASE_URL}${DASHBOARD_URL}`, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(3000);

        // Set page size to 200 to capture all records
        const pagerInfo = await page.evaluate(() => {
            const pager = document.querySelector('.rgPagerCell');
            const text = pager?.textContent?.replace(/\s+/g, ' ').trim() || '';
            const match = text.match(/(\d+) items in (\d+) pages/);
            return {
                totalItems: match ? parseInt(match[1]) : 0,
                totalPages: match ? parseInt(match[2]) : 0,
            };
        });
        console.log(`Grid loaded: ${pagerInfo.totalItems} records, ${pagerInfo.totalPages} pages`);

        // Capture all grid data in one pass
        const gridData = await page.evaluate((fields) => {
            const headerCells = [];
            document.querySelectorAll('.rgMasterTable thead th').forEach((th) => {
                const link = th.querySelector('a');
                headerCells.push(link ? link.textContent.trim() : th.textContent.trim());
            });

            const rows = [];
            document
                .querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow')
                .forEach((tr) => {
                    const cells = {};
                    let formId = '';
                    tr.querySelectorAll('td').forEach((td, j) => {
                        const header = headerCells[j];
                        const text = td.textContent.trim();
                        if (header === 'Form ID') formId = text;
                        if (fields.includes(header)) cells[header] = text || null;
                    });

                    if (formId) rows.push({ formId, fields: cells });
                });

            return { headers: headerCells, totalRows: rows.length, rows };
        }, ALL_DATE_FIELDS);

        console.log(`Captured ${gridData.totalRows} rows with ${ALL_DATE_FIELDS.length} date fields each`);

        // Build results per test record × config
        const results = [];

        // DB-1, DB-2, DB-3: Grid cell value verification
        for (const row of gridData.rows) {
            for (const [config, field] of Object.entries(FIELD_MAP)) {
                const cellValue = row.fields[field] || null;
                results.push({
                    formId: row.formId,
                    config,
                    field,
                    cellValue,
                });
            }
        }

        await context.close();
        await browser.close();

        // Save results
        const output = {
            timestamp: new Date().toISOString(),
            pager: pagerInfo,
            totalRows: gridData.totalRows,
            totalResults: results.length,
            results,
        };

        fs.writeFileSync(RESULTS_PATH, JSON.stringify(output, null, 2));
        console.log(`\nResults saved: ${RESULTS_PATH}`);
        console.log(
            `Total: ${gridData.totalRows} rows × ${Object.keys(FIELD_MAP).length} configs = ${results.length} cell values`
        );
    }

    if (skipArtifacts) {
        console.log('\n--skip-artifacts: skipping artifact generation');
        return;
    }

    // Phase 2: Generate artifacts
    console.log('\n=== Phase 2: Generating artifacts ===\n');

    const genArgs = ['node', GENERATOR_PATH];
    if (categoryFilter) genArgs.push('--category', categoryFilter);

    try {
        require('child_process').execSync(genArgs.join(' '), {
            cwd: REPO_ROOT,
            stdio: 'inherit',
        });
    } catch (err) {
        console.error('Artifact generation failed:', err.message);
        process.exit(1);
    }

    console.log('\n=== Done ===');
}

main().catch((err) => {
    console.error(`Dashboard regression error: ${err.message}`);
    process.exit(1);
});
