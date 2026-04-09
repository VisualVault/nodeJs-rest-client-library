/**
 * DB-4 — Dashboard Column Sort Tests
 *
 * Tests sort ordering on date columns in the DateTest dashboard.
 * Triggers column header sort via __doPostBack and verifies that
 * date values are in correct ascending/descending order.
 *
 * Converted from tasks/date-handling/dashboards/test-sort-v4.js
 */
const { test, expect } = require('@playwright/test');
const path = require('path');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', 'config', 'auth-state-pw.json');
const DASHBOARD_URL =
    'https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25';

const SORT_FIELDS = [
    { field: 'Field7', desc: 'Config A — date-only, ignoreTZ=false' },
    { field: 'Field6', desc: 'Config C — DateTime, ignoreTZ=false' },
];

function parseDateValue(str) {
    if (!str || str.trim() === '') return null;
    return new Date(str);
}

function checkOrder(values, ascending) {
    const dates = values.map((v) => parseDateValue(v.value)).filter((d) => d !== null && !isNaN(d));
    let violations = 0;
    for (let i = 1; i < dates.length; i++) {
        const ok = ascending ? dates[i] >= dates[i - 1] : dates[i] <= dates[i - 1];
        if (!ok) violations++;
    }
    return { total: dates.length, violations };
}

test.describe('DB-4: Dashboard Column Sort', () => {
    test.use({ storageState: AUTH_STATE_PATH });

    for (const { field, desc } of SORT_FIELDS) {
        test(`${field} sort ascending/descending — ${desc}`, async ({ page }) => {
            await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(3000);

            // Get the __doPostBack argument for the column header
            const postbackArg = await page.evaluate((field) => {
                const links = document.querySelectorAll('.rgMasterTable thead th a.GridHeaderLink');
                for (const link of links) {
                    if (link.textContent.trim() === field) {
                        const href = link.getAttribute('href') || '';
                        const match = href.match(/__doPostBack\('([^']+)'/);
                        return match ? match[1] : null;
                    }
                }
                return null;
            }, field);

            expect(postbackArg).not.toBeNull();

            async function captureColumn() {
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
                    document
                        .querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow')
                        .forEach((tr) => {
                            const cells = tr.querySelectorAll('td');
                            values.push({
                                formId: cells[formIdIdx]?.textContent.trim() || '',
                                value: cells[colIdx]?.textContent.trim() || '',
                            });
                        });
                    return values;
                }, field);
            }

            async function triggerSort() {
                await page.addScriptTag({
                    content: `(function() { __doPostBack('${postbackArg}', ''); })();`,
                });
                try {
                    await page.waitForResponse(
                        (resp) => resp.url().includes('FormDataDetails') && resp.status() === 200,
                        { timeout: 15000 }
                    );
                } catch {
                    // AJAX partial postback
                }
                await page.waitForTimeout(4000);
            }

            // Sort ascending (first click)
            await triggerSort();
            const ascData = await captureColumn();
            const ascNonEmpty = ascData.filter((v) => v.value && v.value.trim() !== '');
            const ascCheck = checkOrder(ascNonEmpty, true);

            console.log(`${field} ASC: ${ascCheck.violations} violations / ${ascCheck.total} dates`);

            // Sort descending (second click)
            await triggerSort();
            const descData = await captureColumn();
            const descNonEmpty = descData.filter((v) => v.value && v.value.trim() !== '');
            const descCheck = checkOrder(descNonEmpty, false);

            console.log(`${field} DESC: ${descCheck.violations} violations / ${descCheck.total} dates`);

            expect(ascCheck.violations).toBe(0);
            expect(descCheck.violations).toBe(0);
        });
    }
});
