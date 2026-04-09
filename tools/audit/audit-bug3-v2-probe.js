/**
 * Bug #3 Audit Script — V2 Activation Probe
 *
 * Bug #3 claims initCalendarValueV2() hardcodes enableTime and ignoreTimezone
 * parameters. V2 activates when ?ObjectID= is in the URL, modelId is present,
 * or the server flag is set.
 *
 * This script:
 * 1. Loads saved records normally (V1 baseline)
 * 2. Attempts V2 activation via ?ObjectID= parameter
 * 3. If V2 activates, compares stored values with V1 to detect Bug #3 effects
 * 4. Also verifies the code claim by reading parseDateString behavior
 *
 * Usage: node tools/audit/audit-bug3-v2-probe.js
 */
const { chromium } = require('@playwright/test');
const { AUTH_STATE_PATH, FIELD_MAP } = require('../../testing/fixtures/vv-config');

const BASE_URL = 'https://vvdemo.visualvault.com';

// Pre-saved record URLs with known values
const SAVED_RECORDS = {
    'cat3-A-BRT':
        '/FormViewer/app?DataID=901ce05d-b2f7-42e9-8569-7f9d4caf258d&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-C-BRT':
        '/FormViewer/app?DataID=6d2f720d-8621-4a97-a751-90c4cc8588b6&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-B-BRT':
        '/FormViewer/app?DataID=c63dea33-867e-49e2-b929-fb226b6d3933&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-EF-BRT':
        '/FormViewer/app?DataID=bd05735a-f322-4ba5-9f49-d974c797489f&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
    'cat3-H-BRT':
        '/FormViewer/app?DataID=e154623d-d931-411b-a7e8-3699447e0ddf&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939',
};

// A fake ObjectID GUID to try triggering V2 activation
const FAKE_OBJECT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

async function waitForVVForm(page) {
    await page.waitForFunction(() => typeof VV !== 'undefined' && VV.Form && VV.Form.VV && VV.Form.VV.FormPartition, {
        timeout: 30000,
    });
}

async function captureValues(page, fieldName) {
    return page.evaluate((name) => {
        try {
            const raw = VV.Form.VV.FormPartition.getValueObjectValue(name);
            let api;
            try {
                api = VV.Form.GetFieldValue(name);
            } catch (e) {
                api = `ERROR: ${e.message}`;
            }
            return { raw, api };
        } catch (e) {
            return { raw: `ERROR: ${e.message}`, api: `ERROR: ${e.message}` };
        }
    }, fieldName);
}

async function getV2Flag(page) {
    return page.evaluate(() => {
        try {
            return VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
        } catch (e) {
            return `ERROR: ${e.message}`;
        }
    });
}

// ====== MAIN ======
(async () => {
    console.log('Bug #3 Audit — V2 Activation Probe');
    console.log('='.repeat(60));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        timezoneId: 'America/Sao_Paulo',
        storageState: AUTH_STATE_PATH,
    });

    // ============================================================
    // PHASE 1: Baseline V1 — load saved record normally
    // ============================================================
    console.log('\n--- PHASE 1: V1 Baseline (normal load) ---');
    const v1Page = await context.newPage();
    const recordUrl = BASE_URL + SAVED_RECORDS['cat3-A-BRT'];
    console.log(`  Loading cat3-A-BRT (Config A date-only + Config D DateTime)...`);
    await v1Page.goto(recordUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForVVForm(v1Page);

    const v1Flag = await getV2Flag(v1Page);
    console.log(`  V2 flag: ${v1Flag} (expected: false)`);

    const v1_A = await captureValues(v1Page, 'Field7'); // Config A date-only
    const v1_D = await captureValues(v1Page, 'Field5'); // Config D DateTime+ignoreTZ
    console.log(`  Config A (Field7) V1: raw=${JSON.stringify(v1_A.raw)}, api=${JSON.stringify(v1_A.api)}`);
    console.log(`  Config D (Field5) V1: raw=${JSON.stringify(v1_D.raw)}, api=${JSON.stringify(v1_D.api)}`);
    await v1Page.close();

    // ============================================================
    // PHASE 2: Attempt V2 activation via ?ObjectID= parameter
    // ============================================================
    console.log('\n--- PHASE 2: V2 Activation Attempt (ObjectID parameter) ---');

    // Try multiple approaches to activate V2
    const v2Approaches = [
        {
            name: 'ObjectID in URL',
            url: `${recordUrl}&ObjectID=${FAKE_OBJECT_ID}`,
        },
        {
            name: 'ObjectID as first param',
            url: `${BASE_URL}/FormViewer/app?ObjectID=${FAKE_OBJECT_ID}&DataID=901ce05d-b2f7-42e9-8569-7f9d4caf258d&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939`,
        },
    ];

    let v2Activated = false;
    let v2Page = null;

    for (const approach of v2Approaches) {
        console.log(`\n  Trying: ${approach.name}...`);
        const page = await context.newPage();
        try {
            await page.goto(approach.url, { waitUntil: 'networkidle', timeout: 30000 });
            await waitForVVForm(page);

            const flag = await getV2Flag(page);
            console.log(`  V2 flag: ${flag}`);

            if (flag === true) {
                v2Activated = true;
                v2Page = page;
                console.log('  >>> V2 ACTIVATED! <<<');
                break;
            } else {
                console.log(`  V2 NOT activated via ${approach.name}`);
                await page.close();
            }
        } catch (e) {
            console.log(`  Error: ${e.message.substring(0, 100)}`);
            await page.close();
        }
    }

    // ============================================================
    // PHASE 3: Manual V2 flag flip + reload
    // ============================================================
    if (!v2Activated) {
        console.log('\n--- PHASE 2b: Manual V2 flag flip + page reload ---');
        const manualPage = await context.newPage();
        await manualPage.goto(recordUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await waitForVVForm(manualPage);

        // Set the flag and reload
        console.log('  Setting useUpdatedCalendarValueLogic = true...');
        await manualPage.evaluate(() => {
            VV.Form.calendarValueService.useUpdatedCalendarValueLogic = true;
        });

        // Check if the flag sticks
        const flagAfterSet = await getV2Flag(manualPage);
        console.log(`  Flag after set (before reload): ${flagAfterSet}`);

        // Reload the page to trigger initCalendarValueV2
        console.log('  Reloading page...');
        await manualPage.reload({ waitUntil: 'networkidle', timeout: 30000 });
        await waitForVVForm(manualPage);

        const flagAfterReload = await getV2Flag(manualPage);
        console.log(`  Flag after reload: ${flagAfterReload}`);

        if (flagAfterReload === true) {
            v2Activated = true;
            v2Page = manualPage;
            console.log('  >>> V2 ACTIVATED via manual flag + reload! <<<');
        } else {
            console.log('  V2 NOT activated (flag reset on reload — expected behavior)');
            await manualPage.close();
        }
    }

    // ============================================================
    // PHASE 4: If V2 activated, capture values and compare
    // ============================================================
    if (v2Activated && v2Page) {
        console.log('\n--- PHASE 3: V2 Value Capture ---');
        const v2_A = await captureValues(v2Page, 'Field7');
        const v2_D = await captureValues(v2Page, 'Field5');
        console.log(`  Config A (Field7) V2: raw=${JSON.stringify(v2_A.raw)}, api=${JSON.stringify(v2_A.api)}`);
        console.log(`  Config D (Field5) V2: raw=${JSON.stringify(v2_D.raw)}, api=${JSON.stringify(v2_D.api)}`);

        console.log('\n--- COMPARISON: V1 vs V2 ---');
        console.log(
            `  Config A raw: V1=${JSON.stringify(v1_A.raw)} vs V2=${JSON.stringify(v2_A.raw)} → ${v1_A.raw === v2_A.raw ? 'SAME' : 'DIFFERENT'}`
        );
        console.log(
            `  Config A api: V1=${JSON.stringify(v1_A.api)} vs V2=${JSON.stringify(v2_A.api)} → ${v1_A.api === v2_A.api ? 'SAME' : 'DIFFERENT'}`
        );
        console.log(
            `  Config D raw: V1=${JSON.stringify(v1_D.raw)} vs V2=${JSON.stringify(v2_D.raw)} → ${v1_D.raw === v2_D.raw ? 'SAME' : 'DIFFERENT'}`
        );
        console.log(
            `  Config D api: V1=${JSON.stringify(v1_D.api)} vs V2=${JSON.stringify(v2_D.api)} → ${v1_D.api === v2_D.api ? 'SAME' : 'DIFFERENT'}`
        );

        await v2Page.close();
    }

    // ============================================================
    // PHASE 5: Verify parseDateString behavior via direct invocation
    // ============================================================
    console.log('\n--- PHASE 4: parseDateString Direct Test ---');
    const testPage = await context.newPage();
    await testPage.goto(BASE_URL + SAVED_RECORDS['cat3-A-BRT'], { waitUntil: 'networkidle', timeout: 30000 });
    await waitForVVForm(testPage);

    const parseResults = await testPage.evaluate(() => {
        const cvs = VV.Form.calendarValueService;
        const testValue = '2026-03-15';

        // What V2 saved-data path does (hardcoded enableTime=true):
        const v2Result = cvs.parseDateString(testValue, true, false);

        // What it SHOULD do (actual enableTime=false for Config A):
        const correctResult = cvs.parseDateString(testValue, false, false);

        // DateTime preset test (hardcoded enableTime=false, ignoreTimezone=true)
        const dateTimeValue = '2026-03-15T00:00:00';
        const v2PresetResult = cvs.parseDateString(dateTimeValue, false, true); // V2 hardcoded
        const correctPresetResult = cvs.parseDateString(dateTimeValue, true, false); // Correct for Config C

        return {
            dateOnlySaved: {
                input: testValue,
                v2_enableTime_true: v2Result,
                correct_enableTime_false: correctResult,
                match: v2Result === correctResult,
            },
            dateTimePreset: {
                input: dateTimeValue,
                v2_enableTimeFalse_ignoreTZTrue: v2PresetResult,
                correct_enableTimeTrue_ignoreTZFalse: correctPresetResult,
                match: v2PresetResult === correctPresetResult,
            },
        };
    });

    console.log('\n  Date-only saved data (Config A, "2026-03-15"):');
    console.log(`    V2 path (enableTime=true):  ${parseResults.dateOnlySaved.v2_enableTime_true}`);
    console.log(`    Correct (enableTime=false): ${parseResults.dateOnlySaved.correct_enableTime_false}`);
    console.log(
        `    Match: ${parseResults.dateOnlySaved.match ? 'YES (no impact for this input)' : 'NO — Bug #3 produces different result'}`
    );

    console.log('\n  DateTime preset (Config C, "2026-03-15T00:00:00"):');
    console.log(
        `    V2 path (enableTime=false, ignoreTZ=true):  ${parseResults.dateTimePreset.v2_enableTimeFalse_ignoreTZTrue}`
    );
    console.log(
        `    Correct (enableTime=true, ignoreTZ=false):  ${parseResults.dateTimePreset.correct_enableTimeTrue_ignoreTZFalse}`
    );
    console.log(
        `    Match: ${parseResults.dateTimePreset.match ? 'YES (no impact)' : 'NO — Bug #3 produces different result'}`
    );

    // Also test with a value that has time component
    const parseResults2 = await testPage.evaluate(() => {
        const cvs = VV.Form.calendarValueService;

        // Date-only field loading "2026-03-15T03:00:00.000Z" from DB (legacy popup stored this)
        const legacyStored = '2026-03-15T03:00:00.000Z';
        const v2_with_enableTime = cvs.parseDateString(legacyStored, true, false);
        const correct_without_enableTime = cvs.parseDateString(legacyStored, false, false);

        // Config D (ignoreTZ=true) saved value
        const configDValue = '2026-03-15T00:00:00';
        const v2_saved = cvs.parseDateString(configDValue, true, true); // V2 correct for D (enableTime matches)
        const v2_preset = cvs.parseDateString(configDValue, false, true); // V2 preset path (hardcoded)

        return {
            legacyStored: {
                input: legacyStored,
                v2_enableTime_true: v2_with_enableTime,
                correct_enableTime_false: correct_without_enableTime,
                match: v2_with_enableTime === correct_without_enableTime,
            },
            configD: {
                input: configDValue,
                v2_saved_enableTime_true: v2_saved,
                v2_preset_enableTime_false: v2_preset,
                match: v2_saved === v2_preset,
            },
        };
    });

    console.log('\n  Legacy-stored UTC datetime ("2026-03-15T03:00:00.000Z") on date-only field:');
    console.log(`    V2 path (enableTime=true):  ${parseResults2.legacyStored.v2_enableTime_true}`);
    console.log(`    Correct (enableTime=false): ${parseResults2.legacyStored.correct_enableTime_false}`);
    console.log(`    Match: ${parseResults2.legacyStored.match ? 'YES' : 'NO — Bug #3 produces different result'}`);

    console.log('\n  Config D value ("2026-03-15T00:00:00") — saved vs preset path:');
    console.log(
        `    V2 saved path (enableTime=true, ignoreTZ=true):  ${parseResults2.configD.v2_saved_enableTime_true}`
    );
    console.log(
        `    V2 preset path (enableTime=false, ignoreTZ=true): ${parseResults2.configD.v2_preset_enableTime_false}`
    );
    console.log(`    Match: ${parseResults2.configD.match ? 'YES' : 'NO — hardcoded params cause different result'}`);

    await testPage.close();
    await browser.close();

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('AUDIT SUMMARY — Bug #3: Hardcoded Parameters in initCalendarValueV2()');
    console.log('='.repeat(60));
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Timezone: America/Sao_Paulo (BRT)`);
    console.log(`V2 Activation: ${v2Activated ? 'SUCCESS' : 'FAILED — V2 could not be activated'}`);
    console.log(`parseDateString Verification: Results above show whether hardcoded params produce different outputs`);
    console.log('\nDone.');
})();
