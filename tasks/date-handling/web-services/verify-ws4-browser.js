#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * WS-4 Browser Verification — Playwright step for API→Forms cross-layer testing.
 *
 * After the harness creates a record via API (WS-4 action), this script opens
 * the record in a browser and verifies that Forms displays the correct values.
 *
 * Usage:
 *   node verify-ws4-browser.js --data-id <GUID> --configs A,C --tz America/Sao_Paulo
 *   node verify-ws4-browser.js --data-id <GUID> --configs A --tz Asia/Calcutta --expected '{"A":"2026-03-15T00:00:00Z"}'
 *
 * Requires: Playwright installed, auth state at testing/config/auth-state-pw.json
 */

const path = require('path');
const fs = require('fs');

// Field configuration map — mirrors the harness FIELD_MAP
const FIELD_MAP = {
    A: { field: 'Field7', enableTime: false, ignoreTimezone: false, useLegacy: false },
    B: { field: 'Field10', enableTime: false, ignoreTimezone: true, useLegacy: false },
    C: { field: 'Field6', enableTime: true, ignoreTimezone: false, useLegacy: false },
    D: { field: 'Field5', enableTime: true, ignoreTimezone: true, useLegacy: false },
    E: { field: 'Field12', enableTime: false, ignoreTimezone: false, useLegacy: true },
    F: { field: 'Field11', enableTime: false, ignoreTimezone: true, useLegacy: true },
    G: { field: 'Field14', enableTime: true, ignoreTimezone: false, useLegacy: true },
    H: { field: 'Field13', enableTime: true, ignoreTimezone: true, useLegacy: true },
};

// VV environment constants (vvdemo EmanuelJofre/Main)
const XCID = '815eb44d-5ec8-eb11-8200-a8333ebd7939';
const XCDID = '845eb44d-5ec8-eb11-8200-a8333ebd7939';

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--data-id':
                parsed.dataId = args[++i];
                break;
            case '--configs':
                parsed.configs = args[++i];
                break;
            case '--tz':
                parsed.tz = args[++i];
                break;
            case '--expected':
                parsed.expected = JSON.parse(args[++i]);
                break;
            case '--help':
                console.log(
                    'Usage: node verify-ws4-browser.js --data-id <GUID> --configs A,C [--tz <IANA>] [--expected \'{"A":"value"}\']'
                );
                process.exit(0);
        }
    }
    if (!parsed.dataId) throw new Error('--data-id is required');
    if (!parsed.configs) throw new Error('--configs is required');
    return parsed;
}

async function main() {
    const args = parseArgs();
    const configs = args.configs.split(',').map((s) => s.trim().toUpperCase());
    const tz = args.tz || 'America/Sao_Paulo';

    // Load auth state
    const authStatePath = path.join(__dirname, '..', '..', '..', 'testing', 'config', 'auth-state-pw.json');
    if (!fs.existsSync(authStatePath)) {
        console.error(`Auth state not found: ${authStatePath}`);
        console.error('Run a Playwright test first to generate auth state.');
        process.exit(1);
    }
    const authState = JSON.parse(fs.readFileSync(authStatePath, 'utf8'));

    // Build DataID URL
    const formUrl = `/FormViewer/app?DataID=${args.dataId}&hidemenu=true&rOpener=1&xcid=${XCID}&xcdid=${XCDID}`;

    // Launch Playwright
    const { chromium } = require('@playwright/test');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
        baseURL: 'https://vvdemo.visualvault.com',
        storageState: authState,
        timezoneId: tz,
    });
    const page = await context.newPage();

    console.log(`Browser TZ: ${tz}`);
    console.log(`Navigating to: ${formUrl}`);

    // Navigate and wait for VV.Form
    await page.goto(formUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForFunction(
        () =>
            typeof VV !== 'undefined' &&
            VV.Form &&
            VV.Form.VV &&
            VV.Form.VV.FormPartition &&
            VV.Form.VV.FormPartition.fieldMaster,
        { timeout: 60000 }
    );

    // Verify browser timezone
    const browserTz = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log(`Browser resolved TZ: ${browserTz}`);

    // Check V1/V2 code path
    const isV2 = await page.evaluate(() => VV.Form.calendarValueService.useUpdatedCalendarValueLogic);
    console.log(`Code path: ${isV2 ? 'V2' : 'V1'}`);

    // Collect field values for each config
    const results = [];
    for (const configKey of configs) {
        const config = FIELD_MAP[configKey];
        if (!config) {
            console.error(`Unknown config: ${configKey}`);
            continue;
        }

        const fieldName = config.field;
        const values = await page.evaluate(
            (name) => ({
                getFieldValue: VV.Form.GetFieldValue(name),
                rawValue: VV.Form.VV.FormPartition.getValueObjectValue(name),
                displayValue: (() => {
                    // Try to get the visual display from the DOM input
                    const el =
                        document.querySelector(`kendo-datepicker[aria-label="${name}"] input`) ||
                        document.querySelector(`kendo-datetimepicker[aria-label="${name}"] input`) ||
                        document.querySelector(`[aria-label="${name}"]`);
                    return el ? el.value || el.textContent : null;
                })(),
            }),
            fieldName
        );

        const expected = args.expected ? args.expected[configKey] : null;
        const entry = {
            config: configKey,
            fieldName,
            enableTime: config.enableTime,
            ignoreTimezone: config.ignoreTimezone,
            useLegacy: config.useLegacy,
            getFieldValue: values.getFieldValue,
            rawValue: values.rawValue,
            displayValue: values.displayValue,
        };

        if (expected) {
            entry.expectedApiStored = expected;
        }

        results.push(entry);
    }

    await browser.close();

    // Output structured JSON result
    const output = {
        action: 'WS-4-browser',
        dataId: args.dataId,
        browserTz: browserTz,
        codePath: isV2 ? 'V2' : 'V1',
        results,
    };

    console.log('\n' + JSON.stringify(output, null, 2));
}

main().catch((err) => {
    console.error(`Browser verification error: ${err.message}`);
    process.exit(1);
});
