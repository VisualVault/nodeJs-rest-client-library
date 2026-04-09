/**
 * Bug #5 Audit Script — GetFieldValue Adds Fake [Z] Causing Progressive Drift
 *
 * Verifies that getCalendarFieldValue() adds a literal [Z] to Config D values
 * and that round-tripping via GetFieldValue→SetFieldValue causes progressive drift.
 *
 * Tests:
 * 1. Direct getCalendarFieldValue() invocation — confirm fake Z in BRT + IST (TZ-invariance proof)
 * 2. End-to-end Config D typed input — raw vs GFV comparison
 * 3. Round-trip drift — GetFieldValue→SetFieldValue cycle, measure shift
 * 4. Cross-config comparison — D (fake Z) vs C (real UTC) vs H (passthrough)
 * 5. Year boundary edge case — Jan 1 midnight drift crosses into previous year
 *
 * Usage: node testing/scripts/audit-bug5-fake-z.js
 */
const { chromium } = require('@playwright/test');
const { AUTH_STATE_PATH } = require('../../testing/fixtures/vv-config');

const BASE_URL = 'https://vvdemo.visualvault.com';
const FORM_TEMPLATE_URL =
    '/FormViewer/app?hidemenu=true' +
    '&formid=6be0265c-152a-f111-ba23-0afff212cc87' +
    '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
    '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939';

async function loadForm(context) {
    const page = await context.newPage();
    await page.goto(BASE_URL + FORM_TEMPLATE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => typeof VV !== 'undefined' && VV.Form && VV.Form.VV && VV.Form.VV.FormPartition, {
        timeout: 30000,
    });
    return page;
}

// ====== MAIN ======
(async () => {
    console.log('Bug #5 Audit — GetFieldValue Adds Fake [Z] Causing Progressive Drift');
    console.log('='.repeat(65));

    const browser = await chromium.launch({ headless: true });

    // ============================================================
    // TEST 1: TZ-Invariance Proof (BRT + IST produce identical fake Z)
    // ============================================================
    console.log('\n--- TEST 1: TZ-Invariance Proof ---');
    console.log('  If Z were real UTC, BRT and IST would return DIFFERENT values.');
    console.log('  If Z is fake (literal), both return IDENTICAL values.\n');

    const brtCtx = await browser.newContext({ timezoneId: 'America/Sao_Paulo', storageState: AUTH_STATE_PATH });
    const istCtx = await browser.newContext({ timezoneId: 'Asia/Kolkata', storageState: AUTH_STATE_PATH });

    const brtPage = await loadForm(brtCtx);
    const istPage = await loadForm(istCtx);

    const storedValue = '2026-03-15T00:00:00';

    const brtGFV = await brtPage.evaluate((val) => {
        const cvs = VV.Form.calendarValueService;
        return cvs.getCalendarFieldValue({ enableTime: true, ignoreTimezone: true, useLegacy: false }, val);
    }, storedValue);

    const istGFV = await istPage.evaluate((val) => {
        const cvs = VV.Form.calendarValueService;
        return cvs.getCalendarFieldValue({ enableTime: true, ignoreTimezone: true, useLegacy: false }, val);
    }, storedValue);

    console.log(`  Stored value:  ${storedValue}`);
    console.log(`  BRT GFV:       ${brtGFV}`);
    console.log(`  IST GFV:       ${istGFV}`);
    console.log(
        `  Identical:     ${brtGFV === istGFV ? 'YES ← FAKE Z PROVEN (literal, not UTC conversion)' : 'NO — real UTC conversion'}`
    );

    // Also test Config C for contrast (should differ between BRT/IST)
    const brtGFV_C = await brtPage.evaluate((val) => {
        const cvs = VV.Form.calendarValueService;
        return cvs.getCalendarFieldValue({ enableTime: true, ignoreTimezone: false, useLegacy: false }, val);
    }, storedValue);

    const istGFV_C = await istPage.evaluate((val) => {
        const cvs = VV.Form.calendarValueService;
        return cvs.getCalendarFieldValue({ enableTime: true, ignoreTimezone: false, useLegacy: false }, val);
    }, storedValue);

    console.log(`\n  Config C contrast (real UTC via new Date().toISOString()):`);
    console.log(`  BRT Config C:  ${brtGFV_C}`);
    console.log(`  IST Config C:  ${istGFV_C}`);
    console.log(
        `  Identical:     ${brtGFV_C === istGFV_C ? 'YES (unexpected)' : 'NO ← REAL UTC (different TZ → different UTC value)'}`
    );

    await brtPage.close();
    await istPage.close();

    // ============================================================
    // TEST 2: End-to-End Config D (BRT)
    // ============================================================
    console.log('\n--- TEST 2: End-to-End Config D Typed Input (BRT) ---');
    const page2 = await loadForm(brtCtx);

    // Type date in Field5 (Config D)
    const fieldContainer = page2.locator('[aria-label="Field5"]');
    await fieldContainer.scrollIntoViewIfNeeded();
    const input = fieldContainer.locator('input').first();
    await input.click();
    for (const part of ['03', '15', '2026', '12', '00', 'AM']) {
        await page2.keyboard.type(part);
    }
    await page2.keyboard.press('Tab');
    await page2.waitForFunction(
        () => {
            const v = VV.Form.VV.FormPartition.getValueObjectValue('Field5');
            return v && v !== '';
        },
        { timeout: 5000 }
    );

    const e2e = await page2.evaluate(() => {
        const raw = VV.Form.VV.FormPartition.getValueObjectValue('Field5');
        let api;
        try {
            api = VV.Form.GetFieldValue('Field5');
        } catch (e) {
            api = `ERROR: ${e.message}`;
        }
        return { raw, api };
    });

    console.log(`  Raw stored:     ${JSON.stringify(e2e.raw)}`);
    console.log(`  GFV return:     ${JSON.stringify(e2e.api)}`);
    console.log(`  Raw has Z:      ${e2e.raw.includes('Z') ? 'YES' : 'NO ← correct (no Z in storage)'}`);
    console.log(`  GFV has Z:      ${e2e.api.includes('Z') ? 'YES ← FAKE Z added by getCalendarFieldValue' : 'NO'}`);
    console.log(`  Values match:   ${e2e.raw === e2e.api ? 'YES' : 'NO ← Bug #5 (GFV transforms raw)'}`);

    // ============================================================
    // TEST 3: Round-Trip Drift (BRT: -3h expected)
    // ============================================================
    console.log('\n--- TEST 3: Round-Trip Drift (BRT, -3h/trip expected) ---');

    const driftResults = await page2.evaluate(() => {
        const results = [];
        const field = 'Field5';
        // Capture pre-trip state
        const beforeRaw = VV.Form.VV.FormPartition.getValueObjectValue(field);
        const gfvValue = VV.Form.GetFieldValue(field);
        results.push({ step: 'Before trip', raw: beforeRaw, gfv: gfvValue });

        // Execute round-trip: GFV → SFV
        VV.Form.SetFieldValue(field, gfvValue);
        return new Promise((resolve) => {
            setTimeout(() => {
                const afterRaw = VV.Form.VV.FormPartition.getValueObjectValue(field);
                const afterGfv = VV.Form.GetFieldValue(field);
                results.push({ step: 'After 1 trip', raw: afterRaw, gfv: afterGfv });

                // Second trip
                VV.Form.SetFieldValue(field, afterGfv);
                setTimeout(() => {
                    const after2Raw = VV.Form.VV.FormPartition.getValueObjectValue(field);
                    const after2Gfv = VV.Form.GetFieldValue(field);
                    results.push({ step: 'After 2 trips', raw: after2Raw, gfv: after2Gfv });

                    // Third trip
                    VV.Form.SetFieldValue(field, after2Gfv);
                    setTimeout(() => {
                        const after3Raw = VV.Form.VV.FormPartition.getValueObjectValue(field);
                        results.push({ step: 'After 3 trips', raw: after3Raw });
                        resolve(results);
                    }, 500);
                }, 500);
            }, 500);
        });
    });

    for (const r of driftResults) {
        console.log(`  ${r.step}: raw=${r.raw}${r.gfv ? `, gfv=${r.gfv}` : ''}`);
    }

    await page2.close();

    // ============================================================
    // TEST 3b: Round-Trip Drift (IST: +5:30h expected)
    // ============================================================
    console.log('\n--- TEST 3b: Round-Trip Drift (IST, +5:30h/trip expected) ---');
    const istPage2 = await loadForm(istCtx);

    // Set initial value
    await istPage2.evaluate(() => VV.Form.SetFieldValue('Field5', '03/15/2026 12:00 AM'));
    await istPage2.waitForTimeout(1000);

    const istDrift = await istPage2.evaluate(() => {
        const results = [];
        const field = 'Field5';
        const beforeRaw = VV.Form.VV.FormPartition.getValueObjectValue(field);
        const gfv = VV.Form.GetFieldValue(field);
        results.push({ step: 'Before trip', raw: beforeRaw, gfv });

        VV.Form.SetFieldValue(field, gfv);
        return new Promise((resolve) => {
            setTimeout(() => {
                const afterRaw = VV.Form.VV.FormPartition.getValueObjectValue(field);
                const afterGfv = VV.Form.GetFieldValue(field);
                results.push({ step: 'After 1 trip', raw: afterRaw, gfv: afterGfv });

                VV.Form.SetFieldValue(field, afterGfv);
                setTimeout(() => {
                    const after2Raw = VV.Form.VV.FormPartition.getValueObjectValue(field);
                    results.push({ step: 'After 2 trips', raw: after2Raw });
                    resolve(results);
                }, 500);
            }, 500);
        });
    });

    for (const r of istDrift) {
        console.log(`  ${r.step}: raw=${r.raw}${r.gfv ? `, gfv=${r.gfv}` : ''}`);
    }
    await istPage2.close();

    // ============================================================
    // TEST 4: Cross-Config Comparison
    // ============================================================
    console.log('\n--- TEST 4: Cross-Config Comparison (BRT) ---');
    const page4 = await loadForm(brtCtx);

    const configs = [
        { label: 'D (DateTime, ignoreTZ, !legacy)', field: 'Field5' },
        { label: 'C (DateTime, !ignoreTZ, !legacy)', field: 'Field6' },
        { label: 'G (DateTime, !ignoreTZ, legacy)', field: 'Field14' },
        { label: 'H (DateTime, ignoreTZ, legacy)', field: 'Field13' },
    ];

    for (const c of configs) {
        await page4.evaluate(({ field }) => VV.Form.SetFieldValue(field, '03/15/2026 12:00 AM'), { field: c.field });
    }
    await page4.waitForTimeout(1500);

    for (const c of configs) {
        const vals = await page4.evaluate(
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
        const hasZ = vals.api.endsWith('Z');
        console.log(`  ${c.label}:`);
        console.log(
            `    Raw: ${vals.raw} | GFV: ${vals.api} | Z: ${hasZ ? 'YES' : 'NO'} | Match: ${vals.raw === vals.api ? 'YES' : 'NO'}`
        );
    }
    await page4.close();

    // ============================================================
    // TEST 5: Year Boundary Edge Case (BRT)
    // ============================================================
    console.log('\n--- TEST 5: Year Boundary Edge Case (Jan 1 midnight, BRT) ---');
    const page5 = await loadForm(brtCtx);

    await page5.evaluate(() => VV.Form.SetFieldValue('Field5', '01/01/2026 12:00 AM'));
    await page5.waitForTimeout(1000);

    const yearBoundary = await page5.evaluate(() => {
        const field = 'Field5';
        const beforeRaw = VV.Form.VV.FormPartition.getValueObjectValue(field);
        const gfv = VV.Form.GetFieldValue(field);
        VV.Form.SetFieldValue(field, gfv);
        return new Promise((resolve) => {
            setTimeout(() => {
                const afterRaw = VV.Form.VV.FormPartition.getValueObjectValue(field);
                resolve({ beforeRaw, gfv, afterRaw });
            }, 500);
        });
    });

    console.log(`  Before:     ${yearBoundary.beforeRaw}`);
    console.log(`  GFV (fake Z): ${yearBoundary.gfv}`);
    console.log(`  After trip: ${yearBoundary.afterRaw}`);
    console.log(
        `  Year crossed: ${yearBoundary.afterRaw.startsWith('2025') ? 'YES ← 2026 → 2025 in single trip!' : 'NO'}`
    );

    await page5.close();
    await brtCtx.close();
    await istCtx.close();
    await browser.close();

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(65));
    console.log('AUDIT SUMMARY — Bug #5: GetFieldValue Adds Fake [Z]');
    console.log('='.repeat(65));
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(
        `\nTZ-invariance proof: BRT GFV=${brtGFV}, IST GFV=${istGFV} → ${brtGFV === istGFV ? 'IDENTICAL = FAKE Z' : 'DIFFERENT'}`
    );
    console.log(
        `Config C contrast: BRT=${brtGFV_C}, IST=${istGFV_C} → ${brtGFV_C !== istGFV_C ? 'DIFFERENT = REAL UTC' : 'SAME'}`
    );
    console.log(`End-to-end: raw=${e2e.raw}, GFV=${e2e.api}`);
    console.log(
        `BRT drift: ${driftResults[0]?.raw} → ${driftResults[1]?.raw} → ${driftResults[2]?.raw} → ${driftResults[3]?.raw}`
    );
    console.log(`IST drift: ${istDrift[0]?.raw} → ${istDrift[1]?.raw} → ${istDrift[2]?.raw}`);
    console.log(
        `Year boundary: ${yearBoundary.beforeRaw} → ${yearBoundary.afterRaw} (${yearBoundary.afterRaw.startsWith('2025') ? 'CROSSED' : 'no cross'})`
    );
})();
