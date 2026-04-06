#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * WS-10 Browser Verification — Freshdesk #124697 endpoint comparison & save-stabilize.
 *
 * Two modes:
 *
 * 1. COMPARE MODE (default): Opens two records (postForms vs forminstance/) side-by-side,
 *    captures GetFieldValue/rawValue/display for each, outputs comparison.
 *
 *    node verify-ws10-browser.js --postforms-id <GUID> --forminstance-id <GUID> --configs C,D --tz America/Sao_Paulo
 *
 * 2. SAVE-STABILIZE MODE: Opens a single postForms-created record, captures values,
 *    saves (commits mutation), reopens, captures again, saves+reopens once more to
 *    verify stability. Tests the "first open mutates, then stabilizes" behavior.
 *
 *    node verify-ws10-browser.js --save-stabilize --data-id <GUID> --configs C,D --tz America/Sao_Paulo
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
const BASE_URL = 'https://vvdemo.visualvault.com';

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = { saveStabilize: false };
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--postforms-id':
                parsed.postformsId = args[++i];
                break;
            case '--forminstance-id':
                parsed.forminstanceId = args[++i];
                break;
            case '--data-id':
                parsed.dataId = args[++i];
                break;
            case '--save-stabilize':
                parsed.saveStabilize = true;
                break;
            case '--configs':
                parsed.configs = args[++i];
                break;
            case '--tz':
                parsed.tz = args[++i];
                break;
            case '--headed':
                parsed.headed = true;
                break;
            case '--help':
                console.log(
                    'Compare:        node verify-ws10-browser.js --postforms-id <GUID> --forminstance-id <GUID> --configs C,D [--tz <IANA>]\n' +
                        'Save-stabilize: node verify-ws10-browser.js --save-stabilize --data-id <GUID> --configs C,D [--tz <IANA>]'
                );
                process.exit(0);
        }
    }
    if (!parsed.configs) throw new Error('--configs is required');
    if (parsed.saveStabilize && !parsed.dataId) throw new Error('--data-id is required for save-stabilize mode');
    if (!parsed.saveStabilize && !parsed.postformsId) throw new Error('--postforms-id is required for compare mode');
    return parsed;
}

function buildFormUrl(dataId) {
    return `/FormViewer/app?DataID=${dataId}&hidemenu=true&rOpener=1&xcid=${XCID}&xcdid=${XCDID}`;
}

async function waitForVVForm(page, timeout = 60000) {
    await page.waitForFunction(
        () =>
            typeof VV !== 'undefined' &&
            VV.Form &&
            VV.Form.VV &&
            VV.Form.VV.FormPartition &&
            VV.Form.VV.FormPartition.fieldMaster,
        { timeout }
    );
}

async function captureFieldValues(page, configs) {
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
                    const el =
                        document.querySelector(`kendo-datepicker[aria-label="${name}"] input`) ||
                        document.querySelector(`kendo-datetimepicker[aria-label="${name}"] input`) ||
                        document.querySelector(`[aria-label="${name}"]`);
                    return el ? el.value || el.textContent : null;
                })(),
            }),
            fieldName
        );

        results.push({
            config: configKey,
            fieldName,
            enableTime: config.enableTime,
            ignoreTimezone: config.ignoreTimezone,
            useLegacy: config.useLegacy,
            ...values,
        });
    }
    return results;
}

async function saveAndReload(page, timeout = 60000) {
    // Save via VV.Form.DoAjaxFormSave — same as ticket #124697 repro steps
    const preSaveId = await page.evaluate(() => VV.Form.DataID || '');

    // Try the Save button first (matches vv-form.js saveFormOnly)
    const saveBtn = page.locator('button.btn-save[aria-label="Save"]');
    const hasSaveBtn = (await saveBtn.count()) > 0;

    if (hasSaveBtn) {
        await saveBtn.click();
    } else {
        // Fallback to API save (same as ticket repro step 7)
        await page.evaluate(() => VV.Form.DoAjaxFormSave());
    }

    // Wait for DataID to change (save complete)
    await page.waitForFunction((oldId) => VV.Form.DataID && VV.Form.DataID !== oldId, preSaveId, {
        timeout,
    });

    const newDataId = await page.evaluate(() => VV.Form.DataID);

    // Full reload to clear SPA state — simulates closing and reopening the form
    const reloadUrl = buildFormUrl(newDataId);
    await page.goto(`${BASE_URL}${reloadUrl}`, { waitUntil: 'networkidle', timeout });
    await waitForVVForm(page, timeout);

    return newDataId;
}

async function launchBrowser(args) {
    const authStatePath = path.join(__dirname, '..', '..', '..', 'testing', 'config', 'auth-state-pw.json');
    if (!fs.existsSync(authStatePath)) {
        console.error(`Auth state not found: ${authStatePath}`);
        console.error('Run a Playwright test first to generate auth state.');
        process.exit(1);
    }
    const authState = JSON.parse(fs.readFileSync(authStatePath, 'utf8'));
    const tz = args.tz || 'America/Sao_Paulo';

    const { chromium } = require('@playwright/test');
    const browser = await chromium.launch({
        channel: 'chrome',
        headless: !args.headed,
    });
    const context = await browser.newContext({
        baseURL: BASE_URL,
        storageState: authState,
        timezoneId: tz,
    });
    const page = await context.newPage();

    return { browser, page, tz };
}

async function runCompareMode(args) {
    const configs = args.configs.split(',').map((s) => s.trim().toUpperCase());
    const { browser, page } = await launchBrowser(args);

    const browserTz = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log(`Browser TZ: ${browserTz}`);

    // --- postForms record ---
    console.log(`\n--- postForms record: ${args.postformsId} ---`);
    await page.goto(buildFormUrl(args.postformsId), { waitUntil: 'networkidle', timeout: 60000 });
    await waitForVVForm(page);

    const isV2 = await page.evaluate(() => VV.Form.calendarValueService.useUpdatedCalendarValueLogic);
    console.log(`Code path: ${isV2 ? 'V2' : 'V1'}`);

    const postFormsResults = await captureFieldValues(page, configs);

    // --- forminstance/ record ---
    let formInstanceResults = null;
    if (args.forminstanceId) {
        console.log(`\n--- forminstance/ record: ${args.forminstanceId} ---`);
        await page.goto(buildFormUrl(args.forminstanceId), {
            waitUntil: 'networkidle',
            timeout: 60000,
        });
        await waitForVVForm(page);
        formInstanceResults = await captureFieldValues(page, configs);
    }

    await browser.close();

    const output = {
        action: 'WS-10-compare',
        browserTz,
        codePath: isV2 ? 'V2' : 'V1',
        postForms: {
            dataId: args.postformsId,
            results: postFormsResults,
        },
    };

    if (formInstanceResults) {
        output.formInstance = {
            dataId: args.forminstanceId,
            results: formInstanceResults,
        };

        // Build comparison summary
        output.comparison = configs.map((configKey) => {
            const pf = postFormsResults.find((r) => r.config === configKey);
            const fi = formInstanceResults.find((r) => r.config === configKey);
            return {
                config: configKey,
                gfvMatch: pf?.getFieldValue === fi?.getFieldValue,
                rawMatch: pf?.rawValue === fi?.rawValue,
                displayMatch: pf?.displayValue === fi?.displayValue,
                postForms: {
                    gfv: pf?.getFieldValue,
                    raw: pf?.rawValue,
                    display: pf?.displayValue,
                },
                formInstance: {
                    gfv: fi?.getFieldValue,
                    raw: fi?.rawValue,
                    display: fi?.displayValue,
                },
            };
        });
    }

    console.log('\n' + JSON.stringify(output, null, 2));
}

async function runSaveStabilize(args) {
    const configs = args.configs.split(',').map((s) => s.trim().toUpperCase());
    const { browser, page } = await launchBrowser(args);

    const browserTz = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log(`Browser TZ: ${browserTz}`);

    // --- Snapshot 1: First open (pre-save) ---
    console.log(`\n--- Snapshot 1: First open (pre-save) — ${args.dataId} ---`);
    await page.goto(buildFormUrl(args.dataId), { waitUntil: 'networkidle', timeout: 60000 });
    await waitForVVForm(page);

    const isV2 = await page.evaluate(() => VV.Form.calendarValueService.useUpdatedCalendarValueLogic);
    console.log(`Code path: ${isV2 ? 'V2' : 'V1'}`);

    const snapshot1 = await captureFieldValues(page, configs);

    // --- Save and reopen (commits mutation) ---
    console.log('\n--- Saving form (commits any mutation)... ---');
    const savedDataId = await saveAndReload(page);
    console.log(`Saved DataID: ${savedDataId}`);

    // --- Snapshot 2: After first save + reopen ---
    console.log('\n--- Snapshot 2: After first save + reopen ---');
    const snapshot2 = await captureFieldValues(page, configs);

    // --- Save again and reopen (verify stability) ---
    console.log('\n--- Saving form again (stability check)... ---');
    await saveAndReload(page);

    // --- Snapshot 3: After second save + reopen ---
    console.log('\n--- Snapshot 3: After second save + reopen (should match snapshot 2) ---');
    const snapshot3 = await captureFieldValues(page, configs);

    await browser.close();

    // Build stability analysis per config
    const stability = configs.map((configKey) => {
        const s1 = snapshot1.find((r) => r.config === configKey);
        const s2 = snapshot2.find((r) => r.config === configKey);
        const s3 = snapshot3.find((r) => r.config === configKey);

        const mutatedOnFirstSave = s1?.rawValue !== s2?.rawValue || s1?.getFieldValue !== s2?.getFieldValue;
        const stableAfterFirstSave = s2?.rawValue === s3?.rawValue && s2?.getFieldValue === s3?.getFieldValue;

        return {
            config: configKey,
            mutatedOnFirstSave,
            stableAfterFirstSave,
            snapshot1: { gfv: s1?.getFieldValue, raw: s1?.rawValue, display: s1?.displayValue },
            snapshot2: { gfv: s2?.getFieldValue, raw: s2?.rawValue, display: s2?.displayValue },
            snapshot3: { gfv: s3?.getFieldValue, raw: s3?.rawValue, display: s3?.displayValue },
        };
    });

    const output = {
        action: 'WS-10-save-stabilize',
        dataId: args.dataId,
        savedDataId,
        browserTz,
        codePath: isV2 ? 'V2' : 'V1',
        stability,
    };

    console.log('\n' + JSON.stringify(output, null, 2));
}

async function main() {
    const args = parseArgs();

    if (args.saveStabilize) {
        await runSaveStabilize(args);
    } else {
        await runCompareMode(args);
    }
}

main().catch((err) => {
    console.error(`Browser verification error: ${err.message}`);
    process.exit(1);
});
