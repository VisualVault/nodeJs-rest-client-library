/**
 * Bug #7 Audit Script — Date-Only Fields Store Wrong Day for UTC+ Timezones
 *
 * Verifies that normalizeCalValue() parses date-only strings as local midnight,
 * which for UTC+ users (IST, JST, etc.) represents the PREVIOUS UTC day.
 *
 * Tests:
 * 1. End-to-end IST: type date in Configs A/B/E/F, verify -1 day shift
 * 2. BRT control: same configs, verify NO shift
 * 3. Cross-config: DateTime configs (C/D/G/H) unaffected
 * 4. SetFieldValue with Date object in IST: verify -2 day shift (double-shift)
 * 5. Round-trip compounding in IST: verify cumulative day loss
 * 6. Year/month boundary: verify boundary crossing
 *
 * Usage: node testing/scripts/audit-bug7-wrong-day.js
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

(async () => {
    console.log('Bug #7 Audit — Date-Only Fields Store Wrong Day for UTC+ Timezones');
    console.log('='.repeat(65));

    const browser = await chromium.launch({ headless: true });

    // ============================================================
    // TEST 1: End-to-end IST — date-only fields shift -1 day
    // ============================================================
    console.log('\n--- TEST 1: IST (UTC+5:30) — Date-only fields via SetFieldValue ---');
    const istCtx = await browser.newContext({ timezoneId: 'Asia/Kolkata', storageState: AUTH_STATE_PATH });
    const istPage = await loadForm(istCtx);

    const istTz = await istPage.evaluate(() => new Date().toString().match(/GMT[+-]\d{4}/)?.[0]);
    console.log(`  TZ confirmed: ${istTz}`);

    // Set March 15 on all 8 configs
    const allFields = [
        { config: 'A', field: 'Field7', dateOnly: true, label: 'date-only' },
        { config: 'B', field: 'Field10', dateOnly: true, label: 'date-only+ignoreTZ' },
        { config: 'C', field: 'Field6', dateOnly: false, label: 'DateTime' },
        { config: 'D', field: 'Field5', dateOnly: false, label: 'DateTime+ignoreTZ' },
        { config: 'E', field: 'Field12', dateOnly: true, label: 'legacy date-only' },
        { config: 'F', field: 'Field11', dateOnly: true, label: 'legacy date-only+ignoreTZ' },
        { config: 'G', field: 'Field14', dateOnly: false, label: 'legacy DateTime' },
        { config: 'H', field: 'Field13', dateOnly: false, label: 'legacy DateTime+ignoreTZ' },
    ];

    for (const f of allFields) {
        const inputStr = f.dateOnly ? '03/15/2026' : '03/15/2026 12:00 AM';
        await istPage.evaluate(({ field, val }) => VV.Form.SetFieldValue(field, val), {
            field: f.field,
            val: inputStr,
        });
    }
    await istPage.waitForTimeout(2000);

    console.log('\n  | Config | Field    | Type              | Input     | Stored Raw        | Expected  | Bug #7? |');
    console.log('  |--------|----------|-------------------|-----------|-------------------|-----------|---------|');

    const istResults = [];
    for (const f of allFields) {
        const raw = await istPage.evaluate(({ field }) => VV.Form.VV.FormPartition.getValueObjectValue(field), {
            field: f.field,
        });
        const expected = f.dateOnly ? '2026-03-15' : '2026-03-15T00:00:00';
        const isBug7 = f.dateOnly && raw !== expected;
        istResults.push({ ...f, raw, expected, isBug7 });
        console.log(
            `  | ${f.config.padEnd(6)} | ${f.field.padEnd(8)} | ${f.label.padEnd(17)} | 03/15/2026 | ${raw.padEnd(17)} | ${expected.padEnd(9)} | ${isBug7 ? 'YES -1 day' : 'NO'} |`
        );
    }

    await istPage.close();

    // ============================================================
    // TEST 2: BRT Control — NO shift expected
    // ============================================================
    console.log('\n--- TEST 2: BRT (UTC-3) Control — No shift expected ---');
    const brtCtx = await browser.newContext({ timezoneId: 'America/Sao_Paulo', storageState: AUTH_STATE_PATH });
    const brtPage = await loadForm(brtCtx);

    for (const f of allFields) {
        const inputStr = f.dateOnly ? '03/15/2026' : '03/15/2026 12:00 AM';
        await brtPage.evaluate(({ field, val }) => VV.Form.SetFieldValue(field, val), {
            field: f.field,
            val: inputStr,
        });
    }
    await brtPage.waitForTimeout(2000);

    let brtAllCorrect = true;
    for (const f of allFields.filter((f) => f.dateOnly)) {
        const raw = await brtPage.evaluate(({ field }) => VV.Form.VV.FormPartition.getValueObjectValue(field), {
            field: f.field,
        });
        const correct = raw === '2026-03-15';
        if (!correct) brtAllCorrect = false;
        console.log(`  Config ${f.config} (${f.field}): ${raw} ${correct ? '✓ correct' : '✗ WRONG'}`);
    }
    console.log(`  BRT control: ${brtAllCorrect ? 'ALL CORRECT — no Bug #7 in UTC- timezone' : 'UNEXPECTED FAILURES'}`);

    await brtPage.close();

    // ============================================================
    // TEST 3: Date Object Double-Shift (-2 days in IST)
    // ============================================================
    console.log('\n--- TEST 3: Date Object Double-Shift (IST) ---');
    const istPage2 = await loadForm(istCtx);

    const doubleShift = await istPage2.evaluate(() => {
        // Create a Date object for March 15 local midnight
        const dateObj = new Date(2026, 2, 15); // Month is 0-indexed
        VV.Form.SetFieldValue('Field7', dateObj);
        return new Promise((resolve) => {
            setTimeout(() => {
                const raw = VV.Form.VV.FormPartition.getValueObjectValue('Field7');
                resolve({ input: dateObj.toString(), raw });
            }, 1000);
        });
    });

    console.log(`  Input: new Date(2026, 2, 15) → ${doubleShift.input}`);
    console.log(`  Stored: ${doubleShift.raw}`);
    console.log(`  Expected: 2026-03-15, Got: ${doubleShift.raw}`);
    const daysDiff = doubleShift.raw === '2026-03-13' ? -2 : doubleShift.raw === '2026-03-14' ? -1 : 0;
    console.log(
        `  Shift: ${daysDiff} day(s) ${daysDiff === -2 ? '← DOUBLE-SHIFT CONFIRMED' : daysDiff === -1 ? '← single shift' : '← no shift'}`
    );

    await istPage2.close();

    // ============================================================
    // TEST 4: Round-Trip Compounding (IST)
    // ============================================================
    console.log('\n--- TEST 4: Round-Trip Compounding (IST, -1 day/trip) ---');
    const istPage3 = await loadForm(istCtx);

    const roundTrip = await istPage3.evaluate(() => {
        VV.Form.SetFieldValue('Field7', '2026-03-15');
        return new Promise((resolve) => {
            setTimeout(() => {
                const results = [];
                const raw0 = VV.Form.VV.FormPartition.getValueObjectValue('Field7');
                results.push({ trip: 0, raw: raw0 });

                // Trip 1: GFV → SFV
                const gfv1 = VV.Form.GetFieldValue('Field7');
                VV.Form.SetFieldValue('Field7', gfv1);
                setTimeout(() => {
                    const raw1 = VV.Form.VV.FormPartition.getValueObjectValue('Field7');
                    results.push({ trip: 1, raw: raw1 });

                    // Trip 2
                    const gfv2 = VV.Form.GetFieldValue('Field7');
                    VV.Form.SetFieldValue('Field7', gfv2);
                    setTimeout(() => {
                        const raw2 = VV.Form.VV.FormPartition.getValueObjectValue('Field7');
                        results.push({ trip: 2, raw: raw2 });

                        // Trip 3
                        const gfv3 = VV.Form.GetFieldValue('Field7');
                        VV.Form.SetFieldValue('Field7', gfv3);
                        setTimeout(() => {
                            const raw3 = VV.Form.VV.FormPartition.getValueObjectValue('Field7');
                            results.push({ trip: 3, raw: raw3 });
                            resolve(results);
                        }, 500);
                    }, 500);
                }, 500);
            }, 1000);
        });
    });

    for (const r of roundTrip) {
        console.log(`  Trip ${r.trip}: ${r.raw}`);
    }

    await istPage3.close();

    // ============================================================
    // TEST 5: Year/Month Boundary Crossing (IST)
    // ============================================================
    console.log('\n--- TEST 5: Boundary Crossing (IST) ---');
    const istPage4 = await loadForm(istCtx);

    const boundaries = await istPage4.evaluate(() => {
        const tests = [
            { label: 'Jan 1 (year boundary)', input: '01/01/2026' },
            { label: 'Apr 1 (month boundary)', input: '04/01/2026' },
            { label: 'Mar 1 (month boundary)', input: '03/01/2026' },
        ];
        const results = [];
        for (const t of tests) {
            VV.Form.SetFieldValue('Field7', t.input);
        }
        // Use last set value and check all
        return new Promise((resolve) => {
            setTimeout(() => {
                // Only last SetFieldValue wins for same field, so test sequentially
                const field = 'Field7';
                // Test Jan 1
                VV.Form.SetFieldValue(field, '01/01/2026');
                setTimeout(() => {
                    results.push({ label: 'Jan 1 2026', raw: VV.Form.VV.FormPartition.getValueObjectValue(field) });
                    VV.Form.SetFieldValue(field, '04/01/2026');
                    setTimeout(() => {
                        results.push({ label: 'Apr 1 2026', raw: VV.Form.VV.FormPartition.getValueObjectValue(field) });
                        VV.Form.SetFieldValue(field, '03/01/2026');
                        setTimeout(() => {
                            results.push({
                                label: 'Mar 1 2026',
                                raw: VV.Form.VV.FormPartition.getValueObjectValue(field),
                            });
                            resolve(results);
                        }, 500);
                    }, 500);
                }, 500);
            }, 500);
        });
    });

    for (const b of boundaries) {
        const shifted = b.raw !== b.label.match(/\w+ \d+ \d+/)?.[0];
        console.log(
            `  ${b.label}: stored ${b.raw} ${b.raw.includes('2025') ? '← YEAR CROSSED' : b.raw.endsWith('-28') || b.raw.endsWith('-31') ? '← MONTH CROSSED' : ''}`
        );
    }

    await istPage4.close();
    await istCtx.close();
    await brtCtx.close();
    await browser.close();

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(65));
    console.log('AUDIT SUMMARY — Bug #7: Wrong Day in UTC+ Timezones');
    console.log('='.repeat(65));
    console.log(`Date: ${new Date().toISOString()}`);

    const affected = istResults.filter((r) => r.isBug7);
    const unaffected = istResults.filter((r) => !r.isBug7);
    console.log(
        `\nIST date-only configs affected: ${affected.map((r) => r.config).join(', ')} (${affected.length} configs)`
    );
    console.log(
        `IST DateTime configs unaffected: ${unaffected
            .filter((r) => !r.dateOnly)
            .map((r) => r.config)
            .join(', ')}`
    );
    console.log(`BRT control: ${brtAllCorrect ? 'ALL CORRECT' : 'ISSUES'}`);
    console.log(`Date object double-shift: ${daysDiff === -2 ? 'CONFIRMED (-2 days)' : 'NOT CONFIRMED'}`);
    console.log(`Round-trip: ${roundTrip.map((r) => r.raw).join(' → ')}`);
    console.log(`Year boundary (Jan 1 IST): ${boundaries[0]?.raw}`);
})();
