/* global document, VV */
/**
 * Dashboard cross-layer comparison test — compares dashboard grid values vs Forms SPA display.
 *
 * Usage:
 *   node test-cross-layer.js
 *
 * Tests DateTest-000889 (date-only A,B,E,F) and DateTest-000890 (DateTime C,D,G,H).
 * For each config: captures dashboard grid value, navigates to form, captures form values.
 */
const { chromium } = require('@playwright/test');
const path = require('path');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', '..', 'testing', 'config', 'auth-state-pw.json');
const DASHBOARD_URL =
    'https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25';
const FORM_BASE = 'https://vvdemo.visualvault.com/FormViewer/app';
const XCID = '815eb44d-5ec8-eb11-8200-a8333ebd7939';
const XCDID = '845eb44d-5ec8-eb11-8200-a8333ebd7939';

const RECORDS = [
    {
        instanceName: 'DateTest-000889',
        revisionId: 'f85a0b92-b12e-f111-ba23-0e3ceb11fc25',
        fields: [
            { config: 'A', field: 'Field7', enableTime: false },
            { config: 'B', field: 'Field10', enableTime: false },
            { config: 'E', field: 'Field12', enableTime: false },
            { config: 'F', field: 'Field11', enableTime: false },
        ],
    },
    {
        instanceName: 'DateTest-000890',
        revisionId: '2b5e7795-b12e-f111-ba23-0afff212cc87',
        fields: [
            { config: 'C', field: 'Field6', enableTime: true },
            { config: 'D', field: 'Field5', enableTime: true },
            { config: 'G', field: 'Field14', enableTime: true },
            { config: 'H', field: 'Field13', enableTime: true },
        ],
    },
];

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

async function captureDashboardValues(page, instanceName) {
    return await page.evaluate(
        ({ instanceName, fields }) => {
            const headerCells = [];
            document.querySelectorAll('.rgMasterTable thead th').forEach((th) => {
                const link = th.querySelector('a');
                headerCells.push(link ? link.textContent.trim() : th.textContent.trim());
            });
            const formIdIdx = headerCells.indexOf('Form ID');

            const values = {};
            document
                .querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow')
                .forEach((tr) => {
                    const cells = tr.querySelectorAll('td');
                    const formId = cells[formIdIdx]?.textContent.trim() || '';
                    if (formId === instanceName) {
                        fields.forEach((f) => {
                            const colIdx = headerCells.indexOf(f);
                            values[f] = cells[colIdx]?.textContent.trim() || '(empty)';
                        });
                    }
                });
            return values;
        },
        { instanceName, fields: DATE_FIELDS }
    );
}

async function captureFormValues(page, fieldName) {
    return await page.evaluate((name) => {
        try {
            const raw = VV.Form.VV.FormPartition.getValueObjectValue(name);
            const api = VV.Form.GetFieldValue(name);

            // Try to get display value from DOM
            let display = '(not found)';
            // Calendar fields use different selectors — try multiple approaches
            const ariaLabel = document.querySelector(`[aria-label="${name}"]`);
            if (ariaLabel) {
                const input = ariaLabel.querySelector('input') || ariaLabel;
                display = input.value || input.textContent?.trim() || '(not found)';
            }
            // Fallback: look for input by name pattern
            if (display === '(not found)') {
                const inputs = document.querySelectorAll('input[type="text"]');
                for (const inp of inputs) {
                    const parent = inp.closest('[data-field-name]');
                    if (parent && parent.getAttribute('data-field-name') === name) {
                        display = inp.value;
                        break;
                    }
                }
            }

            return { raw, api, display };
        } catch (err) {
            return { error: err.message };
        }
    }, fieldName);
}

(async () => {
    console.log('=== DB-6 Cross-Layer Comparison Test ===\n');

    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const context = await browser.newContext({
        storageState: AUTH_STATE_PATH,
        timezoneId: 'America/Sao_Paulo',
    });
    const page = await context.newPage();

    // Phase 1: Load dashboard and capture grid values
    console.log('Phase 1: Loading dashboard...');
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    const rowCount = await page.evaluate(
        () => document.querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow').length
    );
    console.log(`Grid loaded: ${rowCount} rows\n`);

    const allResults = [];

    for (const rec of RECORDS) {
        console.log(`--- ${rec.instanceName} ---`);

        // Capture dashboard values
        const dashValues = await captureDashboardValues(page, rec.instanceName);
        console.log('Dashboard values:');
        rec.fields.forEach((f) => {
            console.log(`  ${f.field} (Config ${f.config}): "${dashValues[f.field] || '(not found)'}"`);
        });

        // Navigate to form
        const formUrl = `${FORM_BASE}?DataID=${rec.revisionId}&hidemenu=true&rOpener=1&xcid=${XCID}&xcdid=${XCDID}`;
        console.log(`\nNavigating to form: ${formUrl.substring(0, 80)}...`);

        try {
            await page.goto(formUrl, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForFunction(
                () =>
                    typeof VV !== 'undefined' &&
                    VV.Form &&
                    VV.Form.VV &&
                    VV.Form.VV.FormPartition &&
                    VV.Form.VV.FormPartition.fieldMaster,
                { timeout: 30000 }
            );
            console.log('Form loaded. Capturing values...');

            // Check code path
            const codePath = await page.evaluate(() => VV.Form.calendarValueService.useUpdatedCalendarValueLogic);
            console.log(`Code path: ${codePath ? 'V2' : 'V1'}`);

            // Capture form values for each field
            for (const f of rec.fields) {
                const formVals = await captureFormValues(page, f.field);
                const dashVal = dashValues[f.field] || '(not found)';

                console.log(`\n  Config ${f.config} (${f.field}):`);
                console.log(`    Dashboard:     "${dashVal}"`);
                console.log(`    Form display:  "${formVals.display}"`);
                console.log(`    Form raw:      "${formVals.raw}"`);
                console.log(`    Form GFV:      "${formVals.api}"`);

                // Determine match
                const dashNorm = dashVal.trim();
                const displayNorm = (formVals.display || '').trim();
                const allMatch = dashNorm === displayNorm;

                console.log(`    Match (dash≡display): ${allMatch ? 'YES' : 'NO'}`);

                allResults.push({
                    config: f.config,
                    field: f.field,
                    record: rec.instanceName,
                    dashboardValue: dashVal,
                    formDisplay: formVals.display,
                    formRaw: formVals.raw,
                    formGFV: formVals.api,
                    allMatch,
                });
            }
        } catch (err) {
            console.log(`Form load FAILED: ${err.message}`);
            // Record failure for all fields in this record
            for (const f of rec.fields) {
                allResults.push({
                    config: f.config,
                    field: f.field,
                    record: rec.instanceName,
                    dashboardValue: dashValues[f.field] || '(not found)',
                    formDisplay: '(form load failed)',
                    formRaw: '(form load failed)',
                    formGFV: '(form load failed)',
                    allMatch: false,
                    error: err.message,
                });
            }
        }

        // Navigate back to dashboard for next record
        console.log('\nNavigating back to dashboard...');
        await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(3000);
        console.log('');
    }

    // Summary table
    console.log('\n=== SUMMARY ===');
    console.log('| Config | Field | Dashboard | Form Display | Form Raw | Form GFV | Dash≡Display |');
    console.log('|--------|-------|-----------|--------------|----------|----------|:------------:|');
    for (const r of allResults) {
        console.log(
            `| ${r.config} | ${r.field} | ${r.dashboardValue} | ${r.formDisplay} | ${r.formRaw} | ${r.formGFV} | ${r.allMatch ? 'YES' : 'NO'} |`
        );
    }

    console.log('\n=== DONE ===');
    await context.close();
    await browser.close();
})();
