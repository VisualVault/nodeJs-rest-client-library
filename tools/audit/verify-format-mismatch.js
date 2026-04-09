/**
 * Verification script: Dashboard vs Forms format comparison.
 *
 * Independently verifies that dashboard (.NET) and Forms (Angular) display
 * the same date values in different formats. Uses DateTest-001584 which has
 * Field7 (Config A), Field5 (Config D), Field6 (Config C), Field13 (Config H).
 *
 * Usage:
 *   node testing/scripts/verify-format-mismatch.js
 */
const { chromium } = require('@playwright/test');
const path = require('path');

const AUTH_STATE_PATH = path.join(__dirname, '..', '..', 'testing', 'config', 'auth-state-pw.json');
const DASHBOARD_URL =
    'https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25';
const FORM_URL =
    'https://vvdemo.visualvault.com/FormViewer/app?DataID=03f0d04f-e489-4bd1-a419-f56fc2fc9b50&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939';

const INSTANCE = 'DateTest-001584';
const TEST_FIELDS = [
    { config: 'A', field: 'Field7', type: 'date-only', enableTime: false, ignoreTZ: false, useLegacy: false },
    { config: 'C', field: 'Field6', type: 'DateTime', enableTime: true, ignoreTZ: false, useLegacy: false },
    { config: 'D', field: 'Field5', type: 'DateTime+ignoreTZ', enableTime: true, ignoreTZ: true, useLegacy: false },
    {
        config: 'H',
        field: 'Field13',
        type: 'DateTime+ignoreTZ+legacy',
        enableTime: true,
        ignoreTZ: true,
        useLegacy: true,
    },
];

(async () => {
    console.log('=== FORMAT MISMATCH VERIFICATION ===');
    console.log(`Record: ${INSTANCE}`);
    console.log(`Date: ${new Date().toISOString().split('T')[0]}`);
    console.log(`Fields: ${TEST_FIELDS.map((f) => `${f.field}(${f.config})`).join(', ')}\n`);

    const browser = await chromium.launch({ headless: true, channel: 'chrome' });

    // --- PHASE 1: Dashboard (BRT) ---
    console.log('--- PHASE 1: Dashboard Grid Values (BRT) ---');
    const dashCtx = await browser.newContext({
        storageState: AUTH_STATE_PATH,
        timezoneId: 'America/Sao_Paulo',
    });
    const dashPage = await dashCtx.newPage();
    await dashPage.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await dashPage.waitForTimeout(3000);

    const dashValues = await dashPage.evaluate(
        ({ instanceName, fieldNames }) => {
            const headers = [];
            document.querySelectorAll('.rgMasterTable thead th').forEach((th) => {
                const link = th.querySelector('a');
                headers.push(link ? link.textContent.trim() : th.textContent.trim());
            });
            const formIdIdx = headers.indexOf('Form ID');
            const values = {};

            document
                .querySelectorAll('.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow')
                .forEach((tr) => {
                    const cells = tr.querySelectorAll('td');
                    const formId = cells[formIdIdx]?.textContent.trim() || '';
                    if (formId === instanceName) {
                        fieldNames.forEach((f) => {
                            const idx = headers.indexOf(f);
                            if (idx >= 0) values[f] = cells[idx]?.textContent.trim() || '(empty)';
                        });
                    }
                });
            return values;
        },
        { instanceName: INSTANCE, fieldNames: TEST_FIELDS.map((f) => f.field) }
    );

    for (const f of TEST_FIELDS) {
        console.log(`  ${f.field} (Config ${f.config}, ${f.type}): "${dashValues[f.field] || '(not found)'}"`);
    }
    await dashCtx.close();

    // --- PHASE 2: Form Viewer (BRT) ---
    console.log('\n--- PHASE 2: Form Viewer Display Values (BRT) ---');
    const formCtx = await browser.newContext({
        storageState: AUTH_STATE_PATH,
        timezoneId: 'America/Sao_Paulo',
    });
    const formPage = await formCtx.newPage();
    console.log(`Loading form: ${FORM_URL.substring(0, 80)}...`);
    await formPage.goto(FORM_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await formPage.waitForFunction(
        () =>
            typeof VV !== 'undefined' &&
            VV.Form &&
            VV.Form.VV &&
            VV.Form.VV.FormPartition &&
            VV.Form.VV.FormPartition.fieldMaster,
        { timeout: 30000 }
    );

    const codePath = await formPage.evaluate(() => VV.Form.calendarValueService.useUpdatedCalendarValueLogic);
    console.log(`  Code path: ${codePath ? 'V2' : 'V1'}\n`);

    const formValues = {};
    for (const f of TEST_FIELDS) {
        const vals = await formPage.evaluate((name) => {
            try {
                const raw = VV.Form.VV.FormPartition.getValueObjectValue(name);
                const gfv = VV.Form.GetFieldValue(name);

                // Find display value from DOM
                let display = '(not found)';
                const inputs = document.querySelectorAll('input[type="text"]');
                for (const inp of inputs) {
                    const parent = inp.closest('[data-field-name]');
                    if (parent && parent.getAttribute('data-field-name') === name) {
                        display = inp.value;
                        break;
                    }
                }
                // Fallback: aria-label
                if (display === '(not found)') {
                    const el = document.querySelector(`[aria-label="${name}"]`);
                    if (el) {
                        const input = el.querySelector('input') || el;
                        display = input.value || input.textContent?.trim() || '(not found)';
                    }
                }

                return { display, raw, gfv };
            } catch (err) {
                return { error: err.message };
            }
        }, f.field);

        formValues[f.field] = vals;
        console.log(`  ${f.field} (Config ${f.config}, ${f.type}):`);
        console.log(`    Display: "${vals.display}"`);
        console.log(`    Raw:     "${vals.raw}"`);
        console.log(`    GFV:     "${vals.gfv}"`);
    }
    await formCtx.close();

    // --- PHASE 3: Comparison ---
    console.log('\n--- PHASE 3: Side-by-Side Comparison ---\n');
    console.log('| Config | Field | Type | Dashboard (.NET) | Form (Angular) | Format Match? | Value Match? |');
    console.log('|--------|-------|------|------------------|----------------|:-------------:|:------------:|');

    for (const f of TEST_FIELDS) {
        const dv = dashValues[f.field] || '(not found)';
        const fv = formValues[f.field]?.display || '(not found)';

        const formatMatch = dv === fv ? 'YES' : 'NO';

        // Check if the underlying date is the same (ignoring format)
        // Strip leading zeros and normalize for comparison
        const normDash = dv.replace(/\b0(\d)/g, '$1');
        const normForm = fv.replace(/\b0(\d)/g, '$1');
        const valueMatch = normDash === normForm ? 'YES (fmt only)' : 'NO (value differs)';

        console.log(`| ${f.config} | ${f.field} | ${f.type} | ${dv} | ${fv} | ${formatMatch} | ${valueMatch} |`);
    }

    // --- PHASE 4: Format Pattern Analysis ---
    console.log('\n--- PHASE 4: Format Pattern Analysis ---\n');

    for (const f of TEST_FIELDS) {
        const dv = dashValues[f.field] || '';
        const fv = formValues[f.field]?.display || '';

        // Check for leading zeros
        const dashHasLeadingZeros = /\/0\d/.test(dv) || /^0\d/.test(dv);
        const formHasLeadingZeros = /\/0\d/.test(fv) || /^0\d/.test(fv);

        // Check for AM/PM format
        const dashAmPm = dv.match(/(AM|PM|am|pm|a|p)$/)?.[0] || 'N/A';
        const formAmPm = fv.match(/(AM|PM|am|pm|a|p)$/)?.[0] || 'N/A';

        console.log(`Config ${f.config} (${f.field}):`);
        console.log(`  Dashboard leading zeros: ${dashHasLeadingZeros}`);
        console.log(`  Form leading zeros:      ${formHasLeadingZeros}`);
        if (f.enableTime) {
            console.log(`  Dashboard AM/PM:         "${dashAmPm}"`);
            console.log(`  Form AM/PM:              "${formAmPm}"`);

            // Extract time portions
            const dashTime = dv.match(/\d+:\d+\s*(AM|PM)/i)?.[0] || 'N/A';
            const formTime = fv.match(/\d+:\d+\s*(AM|PM)/i)?.[0] || 'N/A';
            console.log(`  Dashboard time:          "${dashTime}"`);
            console.log(`  Form time:               "${formTime}"`);
            console.log(
                `  Time matches:            ${dashTime === formTime || dashTime.replace(/^0/, '') === formTime.replace(/^0/, '')}`
            );
        }
        console.log('');
    }

    console.log('=== VERIFICATION COMPLETE ===');
    await browser.close();
})();
