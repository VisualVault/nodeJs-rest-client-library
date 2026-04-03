/* global document */
/**
 * Dashboard SQL filter test v3 — uses the SQL filter textarea directly.
 * Makes the hidden SQL filter panel visible, types the WHERE clause, triggers update via postback.
 *
 * Usage:
 *   node test-filter-v3.js --sql "Field7 = '3/15/2026'"
 *   node test-filter-v3.js --sql "Field7 >= '3/14/2026' AND Field7 <= '3/15/2026'"
 *   node test-filter-v3.js --sql "Field6 = '3/15/2026'"
 *   node test-filter-v3.js --batch   # Run all 4 DB-5 queries in sequence
 */
const { chromium } = require('@playwright/test');
const path = require('path');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', '..', 'testing', 'config', 'auth-state-pw.json');
const DASHBOARD_URL =
    'https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25';

const DB5_QUERIES = [
    { id: 'db-5-exact', sql: "Field7 = '3/15/2026'", desc: 'Exact date match on date-only field' },
    { id: 'db-5-range', sql: "Field7 >= '3/14/2026' AND Field7 <= '3/15/2026'", desc: 'Date range on date-only field' },
    { id: 'db-5-dt-exact', sql: "Field6 = '3/15/2026'", desc: 'Exact date match on DateTime field' },
    {
        id: 'db-5-dt-range',
        sql: "Field5 >= '3/14/2026' AND Field5 <= '3/15/2026 11:59 PM'",
        desc: 'DateTime range on ignoreTZ field',
    },
];

async function captureColumnValues(page, fieldName) {
    return await page.evaluate((fieldName) => {
        const headerCells = [];
        document.querySelectorAll('.rgMasterTable thead th').forEach((th) => {
            const link = th.querySelector('a');
            headerCells.push(link ? link.textContent.trim() : th.textContent.trim());
        });
        const colIdx = headerCells.indexOf(fieldName);
        const formIdIdx = headerCells.indexOf('Form ID');
        if (colIdx === -1) return [];
        const values = [];
        document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow').forEach((tr) => {
            const cells = tr.querySelectorAll('td');
            const formId = cells[formIdIdx]?.textContent.trim() || '';
            const val = cells[colIdx]?.textContent.trim() || '';
            if (formId) values.push({ formId, value: val });
        });
        return values;
    }, fieldName);
}

async function getRecordCount(page) {
    const pager = await page.evaluate(() => {
        const p = document.querySelector('.rgPagerCell');
        if (!p) return null;
        const text = p.textContent.replace(/\s+/g, ' ').trim();
        const match = text.match(/(\d+) items in (\d+) pages/);
        return { text, items: match ? parseInt(match[1]) : null, pages: match ? parseInt(match[2]) : null };
    });
    const rows = await page.evaluate(
        () => document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow').length
    );
    return { pager, rows };
}

async function applySQLFilter(page, sql) {
    // The SQL filter textarea and buttons are in a hidden dock panel.
    // We need to: 1) set the textarea value, 2) trigger the UpdateSQLFilter button's postback

    // Get the postback argument for the Update button
    const updateBtnInfo = await page.evaluate(() => {
        const btn = document.getElementById('ctl00_ContentBody_ctrlPanelHolder_ctl0_dockDetail1_C_btnUpdateSQLFilter');
        if (!btn) return { error: 'Update button not found' };
        // RadButton uses a specific click handler; check for __doPostBack in onclick or href
        const input = document.getElementById(
            'ctl00_ContentBody_ctrlPanelHolder_ctl0_dockDetail1_C_btnUpdateSQLFilter_input'
        );
        return {
            btnId: btn.id,
            btnTag: btn.tagName,
            btnClass: btn.className,
            inputId: input ? input.id : null,
            inputValue: input ? input.value : null,
            outerHTML: btn.outerHTML.substring(0, 300),
        };
    });
    console.log(`  Update button: ${JSON.stringify(updateBtnInfo)}`);

    // Set the textarea value
    await page.evaluate((sql) => {
        const ta = document.getElementById('ctl00_ContentBody_ctrlPanelHolder_ctl0_dockDetail1_C_txtSQLFilter');
        if (ta) {
            ta.value = sql;
            // Trigger change event
            ta.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, sql);

    // Trigger the Update button via __doPostBack
    // The button ID can be converted to a postback argument by replacing _ with $
    const postbackArg = 'ctl00$ContentBody$ctrlPanelHolder$ctl0$dockDetail1$C$btnUpdateSQLFilter';

    console.log(`  Triggering postback: ${postbackArg}`);

    await page.addScriptTag({
        content: `
            (function() {
                // Set the textarea value in case evaluate didn't persist across postback
                var ta = document.getElementById('ctl00_ContentBody_ctrlPanelHolder_ctl0_dockDetail1_C_txtSQLFilter');
                if (ta) ta.value = ${JSON.stringify(sql)};
                __doPostBack('${postbackArg}', '');
            })();
        `,
    });

    // Wait for server response
    try {
        await page.waitForResponse((resp) => resp.url().includes('FormDataDetails') && resp.status() === 200, {
            timeout: 15000,
        });
    } catch {
        console.log('  (Waiting for DOM update...)');
    }
    await page.waitForTimeout(4000);
}

async function clearFilter(page) {
    // Clear by setting empty filter and triggering update
    await page.evaluate(() => {
        const ta = document.getElementById('ctl00_ContentBody_ctrlPanelHolder_ctl0_dockDetail1_C_txtSQLFilter');
        if (ta) ta.value = '';
    });

    const postbackArg = 'ctl00$ContentBody$ctrlPanelHolder$ctl0$dockDetail1$C$btnUpdateSQLFilter';
    await page.addScriptTag({
        content: `
            (function() {
                var ta = document.getElementById('ctl00_ContentBody_ctrlPanelHolder_ctl0_dockDetail1_C_txtSQLFilter');
                if (ta) ta.value = '';
                __doPostBack('${postbackArg}', '');
            })();
        `,
    });

    try {
        await page.waitForResponse((resp) => resp.url().includes('FormDataDetails') && resp.status() === 200, {
            timeout: 15000,
        });
    } catch {
        // ignore
    }
    await page.waitForTimeout(4000);
}

(async () => {
    const opts = parseArgs();

    const queries = opts.sql ? [{ id: 'custom', sql: opts.sql, desc: 'Custom query' }] : DB5_QUERIES;

    console.log(`=== DB-5 SQL Filter Test (${queries.length} queries) ===\n`);

    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const context = await browser.newContext({
        storageState: AUTH_STATE_PATH,
        timezoneId: 'America/Sao_Paulo',
    });
    const page = await context.newPage();

    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    const initial = await getRecordCount(page);
    console.log(`Initial: ${initial.pager?.items} records, ${initial.rows} rows on page 1\n`);

    const results = [];

    for (const query of queries) {
        console.log(`--- ${query.id}: ${query.desc} ---`);
        console.log(`  SQL: ${query.sql}`);

        await applySQLFilter(page, query.sql);

        const after = await getRecordCount(page);
        console.log(`  Result: ${after.pager?.items ?? 'unknown'} records, ${after.rows} rows`);

        // Determine the target field from the SQL
        const fieldMatch = query.sql.match(/Field(\d+)/);
        const targetField = fieldMatch ? `Field${fieldMatch[1]}` : 'Field7';

        // Capture values for the target field
        const values = await captureColumnValues(page, targetField);
        const nonEmpty = values.filter((v) => v.value);
        const formIds = values.map((v) => v.formId);

        console.log(`  ${targetField} values (${nonEmpty.length} non-empty):`);
        nonEmpty.slice(0, 15).forEach((v) => console.log(`    ${v.formId}: "${v.value}"`));
        if (nonEmpty.length > 15) console.log(`    ... (${nonEmpty.length - 15} more)`);

        // Check for error messages
        const errorMsg = await page.evaluate(() => {
            // Check for SQL filter warning/error
            const warning = document.getElementById(
                'ctl00_ContentBody_ctrlPanelHolder_ctl0_dockDetail1_C_lblSqlFilterWarning'
            );
            if (warning && warning.textContent.trim()) return warning.textContent.trim();
            // Check for general error
            const err = document.querySelector('.rgNoRecords');
            if (err) return `No records: ${err.textContent.trim()}`;
            return null;
        });
        if (errorMsg) console.log(`  Warning/Error: ${errorMsg}`);

        results.push({
            id: query.id,
            sql: query.sql,
            recordCount: after.pager?.items ?? after.rows,
            nonEmptyCount: nonEmpty.length,
            records: formIds,
            error: errorMsg,
        });

        // Clear filter for next query
        console.log('  Clearing filter...');
        await clearFilter(page);
        const cleared = await getRecordCount(page);
        console.log(`  After clear: ${cleared.pager?.items} records\n`);
    }

    console.log('=== SUMMARY ===');
    console.log('| ID | SQL | Records | Non-empty | Error |');
    console.log('|---|---|---|---|---|');
    for (const r of results) {
        console.log(`| ${r.id} | ${r.sql} | ${r.recordCount} | ${r.nonEmptyCount} | ${r.error || 'none'} |`);
    }

    console.log('\n=== DONE ===');
    await context.close();
    await browser.close();
})();

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--sql') parsed.sql = args[++i];
        if (args[i] === '--batch') parsed.batch = true;
    }
    return parsed;
}
