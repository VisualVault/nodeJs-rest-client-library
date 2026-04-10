#!/usr/bin/env node
/**
 * WADNR WS Browser Verification Script
 *
 * Standalone Playwright script for:
 * 1. Creating an IST-saved record (for WS-2 IST reads)
 * 2. Opening API-created records in BRT/IST browsers to verify display/raw/GFV (WS-4)
 *
 * Usage:
 *   node testing/scripts/wadnr-ws-browser-verify.js
 *
 * Requires: auth-state-pw.json (run global-setup.js or npx playwright test first)
 */

const { chromium } = require('playwright');
const path = require('path');
const {
    gotoAndWaitForVVForm,
    captureFieldValues,
    captureDisplayValue,
    saveFormOnly,
    getBrowserTimezone,
} = require('../helpers/vv-form');
const { typeDateInField } = require('../helpers/vv-calendar');
const { vvConfig, FORM_TEMPLATE_URL, FIELD_MAP } = require('../fixtures/vv-config');

const AUTH_STATE = path.join(__dirname, '..', 'config', 'auth-state-pw.json');
const BASE_URL = vvConfig.baseUrl;

// Records created by WS-1 via the runner (from earlier in this session)
const API_RECORDS = {
    brtDateOnly: { id: 'zzzDATETEST-000392', dataId: null }, // A,B,E,F with "2026-03-15"
    brtDatetime: { id: 'zzzDATETEST-000393', dataId: null }, // C,D,G,H with "2026-03-15T14:30:00"
};

// Configs to verify in browser
const WS4_CONFIGS = ['A', 'C', 'D', 'H'];

// Build record URL from DataID
function recordUrl(dataId) {
    return `/FormViewer/app?DataID=${dataId}&hidemenu=true&rOpener=1&xcid=WADNR&xcdid=fpOnline`;
}

async function resolveDataIds(context) {
    // We need DataIDs (GUIDs), not instance names. Resolve via API by opening the records.
    // Actually, we can get DataIDs by navigating to a search or using the API.
    // Simpler: use the runner to get them. They were in the WS-1 output.
    // For now, we'll look them up by navigating to each record via search.
    // Actually — the revisionIds from WS-1 output ARE the DataIDs.
    API_RECORDS.brtDateOnly.dataId = '0a4f01f5-d834-f111-8310-f323cafecf11'; // from WS-1 output
    API_RECORDS.brtDatetime.dataId = 'd55a70fb-d834-f111-8310-f323cafecf11'; // from WS-1 output
}

async function createIstRecord(browser) {
    console.log('\n=== Phase 2: Create IST-Saved Record ===\n');
    const context = await browser.newContext({
        storageState: AUTH_STATE,
        timezoneId: 'Asia/Kolkata',
    });
    const page = await context.newPage();

    const tz = await getBrowserTimezone(page);
    console.log(`Browser TZ: ${tz}`);

    // Navigate to template form
    const url = BASE_URL + FORM_TEMPLATE_URL;
    console.log(`Navigating to: ${url}`);
    await gotoAndWaitForVVForm(page, url);

    // Type dates into Config A (Field7) and Config D (Field5)
    console.log('Typing 03/15/2026 into Field7 (Config A)...');
    await typeDateInField(page, 'Field7', '03/15/2026');

    console.log('Typing 03/15/2026 02:30 PM into Field5 (Config D)...');
    await typeDateInField(page, 'Field5', '03/15/2026 02:30 PM');

    // Capture pre-save values
    const preA = await captureFieldValues(page, 'Field7');
    const preD = await captureFieldValues(page, 'Field5');
    console.log(`Pre-save A (Field7): raw=${preA.raw}, api=${preA.api}`);
    console.log(`Pre-save D (Field5): raw=${preD.raw}, api=${preD.api}`);

    // Save
    console.log('Saving form...');
    const { dataId, url: savedUrl } = await saveFormOnly(page);
    console.log(`Saved! DataID: ${dataId}`);
    console.log(`Record URL: ${savedUrl}`);

    // Capture the record name
    const instanceName = await page.evaluate(() => {
        const nameEl = document.querySelector('.formInstanceName, [data-field="instanceName"]');
        return nameEl ? nameEl.textContent.trim() : VV.Form.DataID;
    });
    console.log(`Instance name: ${instanceName}`);

    await context.close();
    return { dataId, instanceName };
}

async function verifyWs4Records(browser, apiRecords) {
    console.log('\n=== Phase 5: WS-4 Browser Verification ===\n');

    const timezones = [
        { name: 'BRT', id: 'America/Sao_Paulo' },
        { name: 'IST', id: 'Asia/Kolkata' },
    ];

    const results = [];

    for (const tz of timezones) {
        console.log(`\n--- TZ: ${tz.name} (${tz.id}) ---\n`);
        const context = await browser.newContext({
            storageState: AUTH_STATE,
            timezoneId: tz.id,
        });

        // Verify browser TZ
        const tempPage = await context.newPage();
        const tzStr = await getBrowserTimezone(tempPage);
        console.log(`Browser confirms: ${tzStr}`);
        await tempPage.close();

        // Open the datetime record (has C,D,G,H values)
        const dataId = apiRecords.brtDatetime.dataId;
        const url = BASE_URL + recordUrl(dataId);
        console.log(`Opening record ${apiRecords.brtDatetime.id} (DataID: ${dataId})`);

        const page = await context.newPage();
        await gotoAndWaitForVVForm(page, url);

        for (const configKey of WS4_CONFIGS) {
            const fieldName = FIELD_MAP[configKey].field;
            try {
                const display = await captureDisplayValue(page, fieldName).catch(() => '(timeout)');
                const { raw, api } = await captureFieldValues(page, fieldName);

                const entry = {
                    tz: tz.name,
                    config: configKey,
                    field: fieldName,
                    enableTime: FIELD_MAP[configKey].enableTime,
                    ignoreTimezone: FIELD_MAP[configKey].ignoreTimezone,
                    display,
                    raw,
                    api,
                };
                results.push(entry);
                console.log(`  ${configKey} (${fieldName}): display="${display}" raw="${raw}" api="${api}"`);
            } catch (err) {
                console.log(`  ${configKey} (${fieldName}): ERROR — ${err.message}`);
                results.push({ tz: tz.name, config: configKey, field: fieldName, error: err.message });
            }
        }

        // Also check Config A from the date-only record
        if (apiRecords.brtDateOnly.dataId) {
            const dateOnlyUrl = BASE_URL + recordUrl(apiRecords.brtDateOnly.dataId);
            console.log(`\n  Opening date-only record ${apiRecords.brtDateOnly.id} for Config A...`);
            await page.goto(dateOnlyUrl, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForFunction(
                () =>
                    typeof VV !== 'undefined' &&
                    VV.Form &&
                    VV.Form.VV &&
                    VV.Form.VV.FormPartition &&
                    VV.Form.VV.FormPartition.fieldMaster,
                { timeout: 30000 }
            );
            try {
                const display = await captureDisplayValue(page, 'Field7').catch(() => '(timeout)');
                const { raw, api } = await captureFieldValues(page, 'Field7');
                console.log(`  A (Field7) from date-only record: display="${display}" raw="${raw}" api="${api}"`);
                results.push({
                    tz: tz.name,
                    config: 'A',
                    field: 'Field7',
                    enableTime: false,
                    ignoreTimezone: false,
                    display,
                    raw,
                    api,
                    record: 'dateOnly',
                });
            } catch (err) {
                console.log(`  A (Field7) from date-only record: ERROR — ${err.message}`);
            }
        }

        await context.close();
    }

    return results;
}

async function main() {
    console.log('WADNR WS Browser Verification');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Customer: ${vvConfig.customerAlias}`);
    console.log(`Template URL: ${FORM_TEMPLATE_URL}`);

    resolveDataIds();

    const browser = await chromium.launch({ headless: true });

    try {
        // Phase 2: Create IST record
        const istRecord = await createIstRecord(browser);

        // Phase 5: WS-4 browser verification
        const ws4Results = await verifyWs4Records(browser, API_RECORDS);

        // Output summary
        console.log('\n=== SUMMARY ===\n');
        console.log('IST Record:', JSON.stringify(istRecord, null, 2));
        console.log('\nWS-4 Results:');
        console.log(JSON.stringify(ws4Results, null, 2));
    } finally {
        await browser.close();
    }
}

main().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
