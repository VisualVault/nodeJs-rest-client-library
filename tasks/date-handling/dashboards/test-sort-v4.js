/* global document */
/**
 * Dashboard column sort test v4 — uses page.goto(javascript:...) to trigger postback.
 */
const { chromium } = require('@playwright/test');
const path = require('path');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', '..', 'testing', 'config', 'auth-state-pw.json');
const DASHBOARD_URL =
    'https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25';

function parseDateValue(str) {
    if (!str || str.trim() === '') return null;
    return new Date(str);
}

function checkOrder(values, ascending) {
    const dates = values.map((v) => parseDateValue(v.value)).filter((d) => d !== null && !isNaN(d));
    let violations = 0;
    const details = [];
    for (let i = 1; i < dates.length; i++) {
        const ok = ascending ? dates[i] >= dates[i - 1] : dates[i] <= dates[i - 1];
        if (!ok) {
            violations++;
            if (violations <= 5) details.push(`  Row ${i}: "${values[i - 1].value}" → "${values[i].value}"`);
        }
    }
    return { total: dates.length, violations, details };
}

(async () => {
    const args = process.argv.slice(2);
    const field = args.includes('--field') ? args[args.indexOf('--field') + 1] : 'Field7';

    console.log(`=== DB-4 Sort Test v4: ${field} ===\n`);

    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const context = await browser.newContext({
        storageState: AUTH_STATE_PATH,
        timezoneId: 'America/Sao_Paulo',
    });
    const page = await context.newPage();

    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    const rowCount = await page.evaluate(
        () => document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow').length
    );
    console.log(`Grid loaded: ${rowCount} rows\n`);

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

    // Get the __doPostBack argument
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
    console.log(`PostBack argument: ${postbackArg}\n`);

    async function triggerSort(label) {
        console.log(`${label}: Triggering sort...`);

        // Use addScriptTag to inject a non-strict mode function that calls __doPostBack
        await page.addScriptTag({
            content: `
                (function() {
                    __doPostBack('${postbackArg}', '');
                })();
            `,
        });

        // Wait for the AJAX response
        try {
            await page.waitForResponse((resp) => resp.url().includes('FormDataDetails') && resp.status() === 200, {
                timeout: 15000,
            });
        } catch {
            // Might be AJAX partial postback, try waiting for DOM change
            console.log('  (No full page response detected, waiting for DOM update...)');
        }
        await page.waitForTimeout(4000);
    }

    function analyzeData(data, label, ascending) {
        const nonEmpty = data.filter((v) => v.value && v.value.trim() !== '');
        const empty = data.filter((v) => !v.value || v.value.trim() === '');
        console.log(`  Non-empty: ${nonEmpty.length}, Empty: ${empty.length}`);
        console.log('  First 10:');
        nonEmpty.slice(0, 10).forEach((v, i) => console.log(`    ${i + 1}. ${v.formId}: "${v.value}"`));
        console.log('  Last 5:');
        nonEmpty.slice(-5).forEach((v, i) => console.log(`    ${nonEmpty.length - 4 + i}. ${v.formId}: "${v.value}"`));

        const check = checkOrder(nonEmpty, ascending);
        console.log(
            `  ${label}: ${check.violations} violations / ${check.total} dates → ${check.violations === 0 ? 'PASS' : 'FAIL'}`
        );
        check.details.forEach((d) => console.log(d));

        // Empty position
        const allVals = data.map((v) => v.value);
        const firstEmptyIdx = allVals.findIndex((v) => !v || v.trim() === '');
        const lastNonEmptyIdx = allVals.length - 1 - [...allVals].reverse().findIndex((v) => v && v.trim() !== '');
        if (empty.length > 0) {
            console.log(
                `  Empty cells: ${firstEmptyIdx > lastNonEmptyIdx ? 'BOTTOM' : firstEmptyIdx <= 0 ? 'TOP' : 'MIXED'}`
            );
        }

        return { nonEmpty, check };
    }

    // Sort ascending
    await triggerSort('Sort 1 (ascending)');
    const data1 = await captureColumn();
    const { check: ascCheck } = analyzeData(data1, 'Ascending', true);

    console.log('');

    // Sort descending
    await triggerSort('Sort 2 (descending)');
    const data2 = await captureColumn();
    const { check: descCheck } = analyzeData(data2, 'Descending', false);

    console.log('\n=== SUMMARY ===');
    console.log(
        `${field} Ascending:  ${ascCheck.violations === 0 ? 'PASS' : 'FAIL'} (${ascCheck.violations} violations / ${ascCheck.total} dates)`
    );
    console.log(
        `${field} Descending: ${descCheck.violations === 0 ? 'PASS' : 'FAIL'} (${descCheck.violations} violations / ${descCheck.total} dates)`
    );
    console.log('\n=== DONE ===');

    await context.close();
    await browser.close();
})();
