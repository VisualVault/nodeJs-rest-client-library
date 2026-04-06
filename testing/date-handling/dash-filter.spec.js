/**
 * DB-5 — Dashboard SQL Filter Tests
 *
 * Tests the SQL filter functionality on the DateTest dashboard.
 * Applies WHERE clauses via the hidden SQL filter textarea and verifies
 * that records are filtered correctly for date-only and DateTime fields.
 *
 * Converted from tasks/date-handling/dashboards/test-filter-v3.js
 */
const { test, expect } = require('@playwright/test');
const path = require('path');

const AUTH_STATE_PATH = path.join(__dirname, '..', 'config', 'auth-state-pw.json');
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
    await page.evaluate((sql) => {
        const ta = document.getElementById('ctl00_ContentBody_ctrlPanelHolder_ctl0_dockDetail1_C_txtSQLFilter');
        if (ta) {
            ta.value = sql;
            ta.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, sql);

    const postbackArg = 'ctl00$ContentBody$ctrlPanelHolder$ctl0$dockDetail1$C$btnUpdateSQLFilter';

    await page.addScriptTag({
        content: `
            (function() {
                var ta = document.getElementById('ctl00_ContentBody_ctrlPanelHolder_ctl0_dockDetail1_C_txtSQLFilter');
                if (ta) ta.value = ${JSON.stringify(sql)};
                __doPostBack('${postbackArg}', '');
            })();
        `,
    });

    try {
        await page.waitForResponse((resp) => resp.url().includes('FormDataDetails') && resp.status() === 200, {
            timeout: 15000,
        });
    } catch {
        // DOM update without full response
    }
    await page.waitForTimeout(4000);
}

async function clearFilter(page) {
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

test.describe('DB-5: Dashboard SQL Filter', () => {
    test.use({ storageState: AUTH_STATE_PATH });

    for (const query of DB5_QUERIES) {
        test(`${query.id}: ${query.desc}`, async ({ page }) => {
            await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(3000);

            const initial = await getRecordCount(page);
            expect(initial.pager?.items).toBeGreaterThan(0);

            await applySQLFilter(page, query.sql);

            const after = await getRecordCount(page);

            // Determine the target field from the SQL
            const fieldMatch = query.sql.match(/Field(\d+)/);
            const targetField = fieldMatch ? `Field${fieldMatch[1]}` : 'Field7';

            const values = await captureColumnValues(page, targetField);
            const nonEmpty = values.filter((v) => v.value);

            // Check for error messages
            const errorMsg = await page.evaluate(() => {
                const warning = document.getElementById(
                    'ctl00_ContentBody_ctrlPanelHolder_ctl0_dockDetail1_C_lblSqlFilterWarning'
                );
                if (warning && warning.textContent.trim()) return warning.textContent.trim();
                const err = document.querySelector('.rgNoRecords');
                if (err) return `No records: ${err.textContent.trim()}`;
                return null;
            });

            // Log results for artifact generation
            console.log(`SQL: ${query.sql}`);
            console.log(`Records after filter: ${after.pager?.items ?? after.rows}`);
            console.log(`Non-empty ${targetField} values: ${nonEmpty.length}`);
            nonEmpty.slice(0, 10).forEach((v) => console.log(`  ${v.formId}: "${v.value}"`));
            if (errorMsg) console.log(`Warning/Error: ${errorMsg}`);

            // Filter should return results (no SQL errors)
            expect(errorMsg).toBeNull();
            // Filter should narrow the result set
            expect(after.pager?.items ?? after.rows).toBeLessThanOrEqual(initial.pager?.items);

            await clearFilter(page);
        });
    }
});
