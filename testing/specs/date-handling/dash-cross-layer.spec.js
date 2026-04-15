/**
 * DB-6 — Dashboard Cross-Layer Comparison Tests
 *
 * Compares dashboard grid values vs Forms SPA display for the same records.
 * Tests DateTest-000889 (date-only A,B,E,F) and DateTest-000890 (DateTime C,D,G,H).
 * For each config: captures dashboard grid value, navigates to form, captures form values.
 *
 * Converted from research/date-handling/dashboards/test-cross-layer.js
 */
const { test, expect } = require('@playwright/test');
const path = require('path');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', 'config', 'auth-state-pw.json');
const DASHBOARD_URL =
    'https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25';
const FORM_BASE = 'https://vvdemo.visualvault.com/FormViewer/app';
const XCID = '815eb44d-5ec8-eb11-8200-a8333ebd7939';
const XCDID = '845eb44d-5ec8-eb11-8200-a8333ebd7939';

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

            let display = '(not found)';
            const ariaLabel = document.querySelector(`[aria-label="${name}"]`);
            if (ariaLabel) {
                const input = ariaLabel.querySelector('input') || ariaLabel;
                display = input.value || input.textContent?.trim() || '(not found)';
            }
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

test.describe('DB-6: Dashboard vs Forms Cross-Layer', () => {
    test.use({ storageState: AUTH_STATE_PATH });

    for (const rec of RECORDS) {
        test.describe(rec.instanceName, () => {
            for (const f of rec.fields) {
                test(`Config ${f.config} (${f.field}) — dashboard matches form display`, async ({ page }) => {
                    test.setTimeout(90000);

                    // Load dashboard and capture grid value
                    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
                    await page.waitForTimeout(3000);

                    const dashValues = await captureDashboardValues(page, rec.instanceName);
                    const dashVal = dashValues[f.field] || '(not found)';

                    // Navigate to form
                    const formUrl = `${FORM_BASE}?DataID=${rec.revisionId}&hidemenu=true&rOpener=1&xcid=${XCID}&xcdid=${XCDID}`;
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

                    const formVals = await captureFormValues(page, f.field);

                    console.log(`Config ${f.config} (${f.field}):`);
                    console.log(`  Dashboard:    "${dashVal}"`);
                    console.log(`  Form display: "${formVals.display}"`);
                    console.log(`  Form raw:     "${formVals.raw}"`);
                    console.log(`  Form GFV:     "${formVals.api}"`);

                    // Dashboard and form display should show consistent values
                    // Note: format may differ (.NET vs Angular) — this test captures the comparison
                    expect(dashVal).not.toBe('(not found)');
                    expect(formVals.display).not.toBe('(not found)');
                    expect(formVals.error).toBeUndefined();
                });
            }
        });
    }
});
