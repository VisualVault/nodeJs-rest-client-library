/**
 * Bug #6 Audit Script — GetFieldValue Returns "Invalid Date" for Empty Fields
 *
 * Verifies that getCalendarFieldValue() lacks an empty guard, causing:
 * - Config D: moment("").format(...) → "Invalid Date" (truthy string)
 * - Config C: new Date("").toISOString() → throws RangeError
 *
 * Tests:
 * 1. GetFieldValue on all 8 empty base fields (A-H)
 * 2. Direct getCalendarFieldValue() with "" and null inputs
 * 3. Truthiness verification (the core developer impact)
 * 4. GDOC workaround (GetDateObjectFromCalendar returns undefined for empty)
 *
 * Usage: node tools/audit/audit-bug6-empty-fields.js
 */
const { chromium } = require('@playwright/test');
const { AUTH_STATE_PATH } = require('../../testing/fixtures/vv-config');

const BASE_URL = 'https://vvdemo.visualvault.com';
const FORM_TEMPLATE_URL =
    '/FormViewer/app?hidemenu=true' +
    '&formid=6be0265c-152a-f111-ba23-0afff212cc87' +
    '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
    '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939';

(async () => {
    console.log('Bug #6 Audit — GetFieldValue Returns "Invalid Date" for Empty Fields');
    console.log('='.repeat(65));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        timezoneId: 'America/Sao_Paulo',
        storageState: AUTH_STATE_PATH,
    });
    const page = await context.newPage();
    await page.goto(BASE_URL + FORM_TEMPLATE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => typeof VV !== 'undefined' && VV.Form && VV.Form.VV && VV.Form.VV.FormPartition, {
        timeout: 30000,
    });

    const tz = await page.evaluate(() => new Date().toString().match(/GMT[+-]\d{4}/)?.[0]);
    console.log(`TZ: ${tz}\n`);

    // ============================================================
    // TEST 1: GetFieldValue on all 8 empty base fields
    // ============================================================
    console.log('--- TEST 1: GetFieldValue on all 8 empty base fields ---');

    const fields = [
        { config: 'A', field: 'Field7', enableTime: false, ignoreTZ: false, legacy: false },
        { config: 'B', field: 'Field10', enableTime: false, ignoreTZ: true, legacy: false },
        { config: 'C', field: 'Field6', enableTime: true, ignoreTZ: false, legacy: false },
        { config: 'D', field: 'Field5', enableTime: true, ignoreTZ: true, legacy: false },
        { config: 'E', field: 'Field12', enableTime: false, ignoreTZ: false, legacy: true },
        { config: 'F', field: 'Field11', enableTime: false, ignoreTZ: true, legacy: true },
        { config: 'G', field: 'Field14', enableTime: true, ignoreTZ: false, legacy: true },
        { config: 'H', field: 'Field13', enableTime: true, ignoreTZ: true, legacy: true },
    ];

    const results = await page.evaluate((fieldList) => {
        return fieldList.map((f) => {
            const raw = VV.Form.VV.FormPartition.getValueObjectValue(f.field);
            let api,
                error = null;
            try {
                api = VV.Form.GetFieldValue(f.field);
            } catch (e) {
                api = null;
                error = `${e.constructor.name}: ${e.message}`;
            }
            return {
                config: f.config,
                field: f.field,
                enableTime: f.enableTime,
                ignoreTZ: f.ignoreTZ,
                legacy: f.legacy,
                raw,
                api,
                error,
                truthy: api ? true : false,
                isEmptyString: api === '',
            };
        });
    }, fields);

    console.log(
        '  | Config | Field    | enableTime | ignoreTZ | legacy | Raw | GFV Return        | Truthy | Bug #6? |'
    );
    console.log(
        '  |--------|----------|:----------:|:--------:|:------:|-----|-------------------|:------:|---------|'
    );
    for (const r of results) {
        const gfvDisplay = r.error ? `THROWS: ${r.error}` : JSON.stringify(r.api);
        const bug6 = r.error ? 'YES (crash)' : r.api === 'Invalid Date' ? 'YES (truthy)' : 'NO';
        console.log(
            `  | ${r.config.padEnd(6)} | ${r.field.padEnd(8)} | ${r.enableTime ? 'true' : 'false'}      | ${r.ignoreTZ ? 'true' : 'false'}     | ${r.legacy ? 'true' : 'false'}   | ${JSON.stringify(r.raw).padEnd(3)} | ${gfvDisplay.padEnd(17)} | ${r.truthy ? 'TRUE' : 'false'} | ${bug6} |`
        );
    }

    // ============================================================
    // TEST 2: Direct getCalendarFieldValue() with "" and null
    // ============================================================
    console.log('\n--- TEST 2: Direct getCalendarFieldValue() with empty inputs ---');

    const directResults = await page.evaluate(() => {
        const cvs = VV.Form.calendarValueService;
        const configs = [
            {
                label: 'Config C, input=""',
                cfg: { enableTime: true, ignoreTimezone: false, useLegacy: false },
                input: '',
            },
            {
                label: 'Config D, input=""',
                cfg: { enableTime: true, ignoreTimezone: true, useLegacy: false },
                input: '',
            },
            {
                label: 'Config G, input=""',
                cfg: { enableTime: true, ignoreTimezone: false, useLegacy: true },
                input: '',
            },
            {
                label: 'Config H, input=""',
                cfg: { enableTime: true, ignoreTimezone: true, useLegacy: true },
                input: '',
            },
            {
                label: 'Config A, input=""',
                cfg: { enableTime: false, ignoreTimezone: false, useLegacy: false },
                input: '',
            },
            {
                label: 'Config D, input=null',
                cfg: { enableTime: true, ignoreTimezone: true, useLegacy: false },
                input: null,
            },
            {
                label: 'Config C, input=null',
                cfg: { enableTime: true, ignoreTimezone: false, useLegacy: false },
                input: null,
            },
        ];

        return configs.map((c) => {
            let result,
                error = null;
            try {
                result = cvs.getCalendarFieldValue(c.cfg, c.input);
            } catch (e) {
                result = null;
                error = `${e.constructor.name}: ${e.message}`;
            }
            return {
                label: c.label,
                input: c.input,
                result,
                error,
                truthy: result ? true : false,
            };
        });
    });

    for (const r of directResults) {
        const display = r.error ? `THROWS: ${r.error}` : JSON.stringify(r.result);
        console.log(`  ${r.label}: ${display} (truthy: ${r.truthy})`);
    }

    // ============================================================
    // TEST 3: Truthiness verification (the developer impact)
    // ============================================================
    console.log('\n--- TEST 3: Developer Impact — Standard Pattern ---');
    console.log('  Pattern: if (VV.Form.GetFieldValue("field")) { /* process */ }');

    const truthTest = await page.evaluate(() => {
        const tests = [];
        // Config A (date-only) — should be falsy for empty
        const aVal = VV.Form.GetFieldValue('Field7');
        tests.push({ config: 'A', value: aVal, truthy: !!aVal, correct: !aVal });

        // Config D — should be falsy for empty, but Bug #6 makes it truthy
        let dVal;
        try {
            dVal = VV.Form.GetFieldValue('Field5');
        } catch (e) {
            dVal = null;
        }
        tests.push({ config: 'D', value: dVal, truthy: !!dVal, correct: !dVal });

        // Config C — should be falsy for empty, but Bug #6 throws
        let cVal,
            cError = false;
        try {
            cVal = VV.Form.GetFieldValue('Field6');
        } catch (e) {
            cVal = null;
            cError = true;
        }
        tests.push({ config: 'C', value: cVal, truthy: !!cVal, correct: !cVal, throws: cError });

        // Config H (legacy) — should be falsy for empty
        const hVal = VV.Form.GetFieldValue('Field13');
        tests.push({ config: 'H', value: hVal, truthy: !!hVal, correct: !hVal });

        return tests;
    });

    for (const t of truthTest) {
        const status = t.throws
            ? 'THROWS (crashes script)'
            : t.correct
              ? 'CORRECT (falsy)'
              : `WRONG (truthy: ${JSON.stringify(t.value)})`;
        console.log(`  Config ${t.config}: if(GFV) → ${status}`);
    }

    // ============================================================
    // TEST 4: GDOC Workaround Verification
    // ============================================================
    console.log('\n--- TEST 4: GetDateObjectFromCalendar Workaround ---');

    const gdocResults = await page.evaluate(() => {
        const tests = [];
        for (const field of ['Field5', 'Field6', 'Field7', 'Field13']) {
            let result,
                error = null;
            try {
                result = VV.Form.GetDateObjectFromCalendar(field);
            } catch (e) {
                result = null;
                error = `${e.constructor.name}: ${e.message}`;
            }
            tests.push({
                field,
                result: result === undefined ? 'undefined' : result === null ? 'null' : String(result),
                type: typeof result,
                truthy: !!result,
                error,
            });
        }
        return tests;
    });

    for (const r of gdocResults) {
        const display = r.error ? `THROWS: ${r.error}` : `${r.result} (type: ${r.type}, truthy: ${r.truthy})`;
        console.log(`  ${r.field}: ${display}`);
    }

    await page.close();
    await context.close();
    await browser.close();

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(65));
    console.log('AUDIT SUMMARY — Bug #6: Empty Field Returns "Invalid Date"');
    console.log('='.repeat(65));
    console.log(`Date: ${new Date().toISOString()}`);

    const configC = results.find((r) => r.config === 'C');
    const configD = results.find((r) => r.config === 'D');
    console.log(
        `\nConfig C empty: ${configC.error ? 'THROWS RangeError' : configC.api} — ${configC.error ? 'Bug #6 CONFIRMED (crash)' : 'OK'}`
    );
    console.log(
        `Config D empty: ${configD.api} — ${configD.api === 'Invalid Date' ? 'Bug #6 CONFIRMED (truthy string)' : 'OK'}`
    );

    const safeConfigs = results.filter((r) => !r.error && r.api === '');
    console.log(`Safe configs (return ""): ${safeConfigs.map((r) => r.config).join(', ')}`);
    console.log(
        `GDOC workaround: ${gdocResults.every((r) => !r.error && !r.truthy) ? 'ALL SAFE (undefined/falsy for empty)' : 'ISSUES FOUND'}`
    );
})();
