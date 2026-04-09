/**
 * Dashboard exploration utility — Playwright-based.
 *
 * Reusable script for inspecting the DateTest Dashboard (Telerik RadGrid).
 * Captures grid structure, date values, and compares across timezones.
 *
 * Usage:
 *   node testing/scripts/explore-dashboard.js [--tz BRT|IST|UTC0] [--record DateTest-NNNNNN] [--all]
 *
 * Options:
 *   --tz       Browser timezone (default: BRT). Affects nothing for server-rendered grid,
 *              but useful for cross-layer tests that open form records.
 *   --record   Filter output to a specific record ID
 *   --all      Show all records (default: first 30 with date values)
 *   --compare  Run BRT vs IST vs UTC0 comparison for TZ independence check
 */
const { chromium } = require('@playwright/test');
const path = require('path');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', 'testing', 'config', 'auth-state-pw.json');
const DASHBOARD_URL =
    '/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25';
const BASE = 'https://vvdemo.visualvault.com';

const TZ_MAP = {
    BRT: 'America/Sao_Paulo',
    IST: 'Asia/Calcutta',
    UTC0: 'Etc/GMT',
};

const DATE_FIELDS = [
    'Field1',
    'Field2',
    'Field3',
    'Field4',
    'Field5',
    'Field6',
    'Field7',
    'Field10',
    'Field11',
    'Field12',
    'Field13',
    'Field14',
    'Field15',
    'Field16',
    'Field17',
    'Field18',
    'Field19',
    'Field20',
    'Field21',
    'Field22',
    'Field23',
    'Field24',
    'Field25',
    'Field26',
    'Field27',
    'Field28',
];

// --- Helpers ---

async function loadDashboard(browser, timezoneId) {
    const context = await browser.newContext({
        storageState: AUTH_STATE_PATH,
        timezoneId,
    });
    const page = await context.newPage();
    await page.goto(`${BASE}${DASHBOARD_URL}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    return { context, page };
}

async function captureGridData(page, filterRecord, limit) {
    return await page.evaluate(
        ({ fields, filterRecord, limit }) => {
            const headerCells = [];
            document.querySelectorAll('.rgMasterTable thead th').forEach((th) => {
                const link = th.querySelector('a');
                headerCells.push(link ? link.textContent.trim() : th.textContent.trim());
            });

            const rows = [];
            let count = 0;
            document
                .querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow')
                .forEach((tr) => {
                    if (limit && count >= limit) return;

                    const cells = {};
                    let formId = '';
                    tr.querySelectorAll('td').forEach((td, j) => {
                        const header = headerCells[j];
                        const text = td.textContent.trim();
                        if (header === 'Form ID') formId = text;
                        if (fields.includes(header) && text) cells[header] = text;
                    });

                    if (filterRecord && formId !== filterRecord) return;
                    if (Object.keys(cells).length > 0) {
                        rows.push({ formId, fields: cells });
                        count++;
                    }
                });

            return { headerCells, rows };
        },
        { fields: DATE_FIELDS, filterRecord, limit }
    );
}

async function capturePagerInfo(page) {
    return await page.evaluate(() => {
        const pager = document.querySelector('.rgPagerCell');
        if (!pager) return null;
        const text = pager.textContent.replace(/\s+/g, ' ').trim();
        const match = text.match(/(\d+) items in (\d+) pages/);
        return {
            text,
            totalItems: match ? parseInt(match[1]) : null,
            totalPages: match ? parseInt(match[2]) : null,
        };
    });
}

// --- Main ---

(async () => {
    const args = process.argv.slice(2);
    const tzArg = args.includes('--tz') ? args[args.indexOf('--tz') + 1] : 'BRT';
    const recordArg = args.includes('--record') ? args[args.indexOf('--record') + 1] : null;
    const showAll = args.includes('--all');
    const compare = args.includes('--compare');

    const timezoneId = TZ_MAP[tzArg] || TZ_MAP.BRT;
    const limit = showAll ? null : recordArg ? null : 30;

    const browser = await chromium.launch({ headless: true, channel: 'chrome' });

    if (compare) {
        // TZ comparison mode
        console.log('=== TZ INDEPENDENCE CHECK ===\n');
        const results = {};

        for (const [tz, tzId] of Object.entries(TZ_MAP)) {
            console.log(`Loading ${tz} (${tzId})...`);
            const { context, page } = await loadDashboard(browser, tzId);
            const data = await captureGridData(page, null, 10);
            results[tz] = data.rows;
            await context.close();
        }

        // Compare
        const tzNames = Object.keys(results);
        const baseRows = results[tzNames[0]];

        console.log(`\nComparing ${baseRows.length} records across ${tzNames.join(', ')}:\n`);
        let allMatch = true;

        for (const row of baseRows) {
            let recordMatch = true;
            for (let t = 1; t < tzNames.length; t++) {
                const other = results[tzNames[t]].find((r) => r.formId === row.formId);
                if (!other) {
                    console.log(`  ${row.formId}: MISSING in ${tzNames[t]}`);
                    recordMatch = false;
                    continue;
                }
                for (const [field, val] of Object.entries(row.fields)) {
                    if (other.fields[field] !== val) {
                        console.log(
                            `  ${row.formId} ${field}: ${tzNames[0]}="${val}" vs ${tzNames[t]}="${other.fields[field]}"`
                        );
                        recordMatch = false;
                    }
                }
            }
            if (recordMatch) {
                console.log(`  ${row.formId}: ✓ all TZs match`);
            } else {
                allMatch = false;
            }
        }

        console.log(`\n${allMatch ? 'PASS' : 'FAIL'} — TZ independence ${allMatch ? 'confirmed' : 'NOT confirmed'}`);
    } else {
        // Standard capture mode
        console.log(`=== Dashboard Capture (${tzArg}) ===\n`);

        const { context, page } = await loadDashboard(browser, timezoneId);

        const pager = await capturePagerInfo(page);
        if (pager) {
            console.log(`Records: ${pager.totalItems} in ${pager.totalPages} pages\n`);
        }

        const data = await captureGridData(page, recordArg, limit);
        console.log(`Captured ${data.rows.length} records with date values:\n`);

        for (const row of data.rows) {
            console.log(`${row.formId}:`);
            for (const [field, val] of Object.entries(row.fields)) {
                console.log(`  ${field} = "${val}"`);
            }
        }

        await context.close();
    }

    await browser.close();
    console.log('\n=== DONE ===');
})();
