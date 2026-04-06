/**
 * Bug #4 Audit Script — Legacy Save Format Strips Timezone
 *
 * Verifies that getSaveValue() strips Z from DateTime values and
 * getCalendarFieldValue() reinterprets them in the current timezone.
 *
 * Tests:
 * 1. Direct getSaveValue() invocation — confirm Z stripping
 * 2. Direct getCalendarFieldValue() invocation — confirm TZ reinterpretation
 * 3. End-to-end: type a date in Config C, capture raw + GFV values
 * 4. Cross-config comparison: C (affected) vs D (Bug #5) vs G (legacy) vs A (date-only)
 *
 * Usage: node testing/scripts/audit-bug4-save-format.js
 */
const { chromium } = require('@playwright/test');
const { AUTH_STATE_PATH, FIELD_MAP } = require('../fixtures/vv-config');

const BASE_URL = 'https://vvdemo.visualvault.com';
const FORM_TEMPLATE_URL =
    '/FormViewer/app?hidemenu=true' +
    '&formid=6be0265c-152a-f111-ba23-0afff212cc87' +
    '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
    '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939';

async function loadForm(page) {
    await page.goto(BASE_URL + FORM_TEMPLATE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => typeof VV !== 'undefined' && VV.Form && VV.Form.VV && VV.Form.VV.FormPartition, {
        timeout: 30000,
    });
}

// ====== MAIN ======
(async () => {
    console.log('Bug #4 Audit — Legacy Save Format Strips Timezone');
    console.log('='.repeat(60));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        timezoneId: 'America/Sao_Paulo',
        storageState: AUTH_STATE_PATH,
    });

    const page = await context.newPage();
    await loadForm(page);

    const tzCheck = await page.evaluate(() => new Date().toString());
    console.log(`TZ: ${tzCheck.match(/GMT[+-]\d{4}/)?.[0]}`);
    const isV2 = await page.evaluate(() => VV.Form.calendarValueService.useUpdatedCalendarValueLogic);
    console.log(`Code path: V1=${!isV2}, V2=${isV2}\n`);

    // ============================================================
    // TEST 1: Direct getSaveValue() verification
    // ============================================================
    console.log('--- TEST 1: getSaveValue() Z-stripping ---');
    const saveValueResults = await page.evaluate(() => {
        const cvs = VV.Form.calendarValueService;
        const testInputs = [
            { label: 'UTC midnight ISO+Z', input: '2026-03-15T00:00:00.000Z', enableTime: true, ignoreTZ: false },
            { label: 'BRT midnight ISO+Z', input: '2026-03-15T03:00:00.000Z', enableTime: true, ignoreTZ: false },
            { label: 'DateTime no Z', input: '2026-03-15T00:00:00', enableTime: true, ignoreTZ: false },
            { label: 'Date-only', input: '2026-03-15T03:00:00.000Z', enableTime: false, ignoreTZ: false },
            { label: 'DateTime ignoreTZ', input: '2026-03-15T00:00:00.000Z', enableTime: true, ignoreTZ: true },
        ];
        return testInputs.map((t) => ({
            label: t.label,
            input: t.input,
            output: cvs.getSaveValue(t.input, t.enableTime, t.ignoreTZ),
            hasZ: cvs.getSaveValue(t.input, t.enableTime, t.ignoreTZ).includes('Z'),
        }));
    });

    for (const r of saveValueResults) {
        console.log(`  ${r.label}:`);
        console.log(`    Input:  ${r.input}`);
        console.log(`    Output: ${r.output}`);
        console.log(`    Z present: ${r.hasZ ? 'YES' : 'NO ← Bug #4'}`);
    }

    // ============================================================
    // TEST 2: Direct getCalendarFieldValue() verification
    // ============================================================
    console.log('\n--- TEST 2: getCalendarFieldValue() TZ reinterpretation ---');
    const gfvResults = await page.evaluate(() => {
        const cvs = VV.Form.calendarValueService;
        // Simulate what happens when GFV reads a Z-less stored value
        const storedValue = '2026-03-15T00:00:00'; // What getSaveValue produces (no Z)
        const configs = [
            {
                label: 'Config C (DateTime, !ignoreTZ, !legacy)',
                config: { enableTime: true, ignoreTimezone: false, useLegacy: false },
            },
            {
                label: 'Config D (DateTime, ignoreTZ, !legacy)',
                config: { enableTime: true, ignoreTimezone: true, useLegacy: false },
            },
            {
                label: 'Config G (DateTime, !ignoreTZ, legacy)',
                config: { enableTime: true, ignoreTimezone: false, useLegacy: true },
            },
            {
                label: 'Config A (date-only, !ignoreTZ, !legacy)',
                config: { enableTime: false, ignoreTimezone: false, useLegacy: false },
            },
        ];
        return configs.map((c) => {
            let result;
            try {
                result = cvs.getCalendarFieldValue(c.config, storedValue);
            } catch (e) {
                result = `ERROR: ${e.message}`;
            }
            return {
                label: c.label,
                input: storedValue,
                output: result,
                changed: result !== storedValue,
            };
        });
    });

    for (const r of gfvResults) {
        console.log(`  ${r.label}:`);
        console.log(`    Input:  ${r.input}`);
        console.log(`    Output: ${r.output}`);
        console.log(`    Changed: ${r.changed ? 'YES ← Bug #4 or #5' : 'NO (passthrough)'}`);
    }

    // ============================================================
    // TEST 3: End-to-end — type date in Config C, capture values
    // ============================================================
    console.log('\n--- TEST 3: End-to-end Config C typed input ---');

    // Type a date in Field6 (Config C, DateTime, !ignoreTZ, !legacy)
    const fieldContainer = page.locator('[aria-label="Field6"]');
    await fieldContainer.scrollIntoViewIfNeeded();
    const input = fieldContainer.locator('input').first();
    await input.click();
    // Type 03/15/2026 12:00 AM (parts: 03, 15, 2026, 12, 00, AM)
    for (const part of ['03', '15', '2026', '12', '00', 'AM']) {
        await page.keyboard.type(part);
    }
    await page.keyboard.press('Tab');

    // Wait for value processing
    await page.waitForFunction(
        () => {
            const v = VV.Form.VV.FormPartition.getValueObjectValue('Field6');
            return v && v !== '';
        },
        { timeout: 5000 }
    );

    const e2eValues = await page.evaluate(() => {
        const raw = VV.Form.VV.FormPartition.getValueObjectValue('Field6');
        let api;
        try {
            api = VV.Form.GetFieldValue('Field6');
        } catch (e) {
            api = `ERROR: ${e.message}`;
        }
        return { raw, api };
    });

    console.log(`  Raw stored: ${JSON.stringify(e2eValues.raw)}`);
    console.log(`  GFV return: ${JSON.stringify(e2eValues.api)}`);
    console.log(`  Raw has Z: ${e2eValues.raw.includes('Z') ? 'YES' : 'NO ← getSaveValue stripped Z'}`);
    console.log(
        `  GFV matches raw: ${e2eValues.raw === e2eValues.api ? 'YES' : 'NO ← getCalendarFieldValue transformed'}`
    );

    // ============================================================
    // TEST 4: Cross-config comparison — same input, all DateTime configs
    // ============================================================
    console.log('\n--- TEST 4: Cross-config comparison ---');

    // Set same value on all DateTime configs via SetFieldValue
    const configs = [
        { config: 'C', field: 'Field6', label: 'C (DateTime, !ignoreTZ, !legacy)' },
        { config: 'D', field: 'Field5', label: 'D (DateTime, ignoreTZ, !legacy)' },
        { config: 'G', field: 'Field14', label: 'G (DateTime, !ignoreTZ, legacy)' },
        { config: 'H', field: 'Field13', label: 'H (DateTime, ignoreTZ, legacy)' },
    ];

    // Open fresh form for clean state
    await page.close();
    const page2 = await context.newPage();
    await loadForm(page2);

    for (const c of configs) {
        await page2.evaluate(
            ({ field }) => {
                VV.Form.SetFieldValue(field, '03/15/2026 12:00 AM');
            },
            { field: c.field }
        );
    }

    // Wait for all to process
    await page2.waitForTimeout(2000);

    const crossResults = [];
    for (const c of configs) {
        const vals = await page2.evaluate(
            ({ field }) => {
                const raw = VV.Form.VV.FormPartition.getValueObjectValue(field);
                let api;
                try {
                    api = VV.Form.GetFieldValue(field);
                } catch (e) {
                    api = `ERROR: ${e.message}`;
                }
                return { raw, api };
            },
            { field: c.field }
        );

        crossResults.push({ ...c, ...vals });
        console.log(`  ${c.label}:`);
        console.log(`    Raw: ${JSON.stringify(vals.raw)}`);
        console.log(`    GFV: ${JSON.stringify(vals.api)}`);
        console.log(`    Match: ${vals.raw === vals.api ? 'YES' : 'NO'}`);
    }

    await page2.close();

    // ============================================================
    // TEST 5: IST timezone comparison
    // ============================================================
    console.log('\n--- TEST 5: IST timezone behavior ---');
    const istContext = await browser.newContext({
        timezoneId: 'Asia/Kolkata',
        storageState: AUTH_STATE_PATH,
    });
    const istPage = await istContext.newPage();
    await istPage.goto(BASE_URL + FORM_TEMPLATE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await istPage.waitForFunction(
        () => typeof VV !== 'undefined' && VV.Form && VV.Form.VV && VV.Form.VV.FormPartition,
        { timeout: 30000 }
    );

    const istTz = await istPage.evaluate(() => new Date().toString().match(/GMT[+-]\d{4}/)?.[0]);
    console.log(`  IST TZ confirmed: ${istTz}`);

    // Direct getSaveValue + getCalendarFieldValue in IST
    const istResults = await istPage.evaluate(() => {
        const cvs = VV.Form.calendarValueService;
        const input = '2026-03-15T00:00:00.000Z';

        // getSaveValue strips Z
        const saved = cvs.getSaveValue(input, true, false);

        // getCalendarFieldValue reinterprets in IST
        const gfvConfig = { enableTime: true, ignoreTimezone: false, useLegacy: false };
        const gfv = cvs.getCalendarFieldValue(gfvConfig, saved);

        return { input, saved, gfv };
    });

    console.log(`  Input:              ${istResults.input}`);
    console.log(`  getSaveValue:       ${istResults.saved} (Z present: ${istResults.saved.includes('Z')})`);
    console.log(`  getCalendarFieldValue: ${istResults.gfv}`);

    // Now type in IST and verify
    const istFieldContainer = istPage.locator('[aria-label="Field6"]');
    await istFieldContainer.scrollIntoViewIfNeeded();
    const istInput = istFieldContainer.locator('input').first();
    await istInput.click();
    for (const part of ['03', '15', '2026', '12', '00', 'AM']) {
        await istPage.keyboard.type(part);
    }
    await istPage.keyboard.press('Tab');
    await istPage.waitForFunction(
        () => {
            const v = VV.Form.VV.FormPartition.getValueObjectValue('Field6');
            return v && v !== '';
        },
        { timeout: 5000 }
    );

    const istE2E = await istPage.evaluate(() => {
        const raw = VV.Form.VV.FormPartition.getValueObjectValue('Field6');
        let api;
        try {
            api = VV.Form.GetFieldValue('Field6');
        } catch (e) {
            api = `ERROR: ${e.message}`;
        }
        return { raw, api };
    });

    console.log(`\n  IST end-to-end Config C:`);
    console.log(`    Raw: ${JSON.stringify(istE2E.raw)}`);
    console.log(`    GFV: ${JSON.stringify(istE2E.api)}`);
    console.log(`    Raw has Z: ${istE2E.raw.includes('Z') ? 'YES' : 'NO'}`);

    await istPage.close();
    await istContext.close();
    await browser.close();

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('AUDIT SUMMARY — Bug #4: Legacy Save Format Strips Timezone');
    console.log('='.repeat(60));
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(
        `\ngetSaveValue() Z-stripping: ${saveValueResults.filter((r) => r.label.includes('DateTime') && !r.label.includes('Date-only') && !r.hasZ).length > 0 ? 'CONFIRMED' : 'NOT CONFIRMED'}`
    );
    console.log(
        `getCalendarFieldValue() reinterpretation: ${gfvResults.find((r) => r.label.includes('Config C'))?.changed ? 'CONFIRMED' : 'NOT CONFIRMED'}`
    );
    console.log(`End-to-end Config C BRT: raw=${JSON.stringify(e2eValues.raw)}, api=${JSON.stringify(e2eValues.api)}`);
    console.log(`End-to-end Config C IST: raw=${JSON.stringify(istE2E.raw)}, api=${JSON.stringify(istE2E.api)}`);
    console.log(`\nBug #4 chain: getSaveValue strips Z → getCalendarFieldValue reinterprets in local TZ`);
    console.log(`BRT shift: ${e2eValues.raw} → ${e2eValues.api} (expected +3h)`);
    console.log(`IST shift: ${istE2E.raw} → ${istE2E.api} (expected -5.5h / day boundary cross)`);
    console.log('\nDone.');
})();
