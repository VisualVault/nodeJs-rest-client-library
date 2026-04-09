/**
 * Bug #2 Audit Script — Legacy Popup vs Typed Input
 *
 * For each legacy config (E, F, G, H), this script:
 * 1. Opens a fresh form, selects March 15 via the legacy popup, captures stored values
 * 2. Opens another fresh form, types the date, captures stored values
 * 3. Compares popup vs typed for each config
 *
 * Also runs Config A (non-legacy) as a control.
 *
 * Usage: node testing/scripts/explore-legacy-popup.js
 */
const { chromium } = require('@playwright/test');
const { AUTH_STATE_PATH, FIELD_MAP } = require('../../testing/fixtures/vv-config');

const BASE_URL = 'https://vvdemo.visualvault.com';
const FORM_TEMPLATE_URL =
    '/FormViewer/app?hidemenu=true' +
    '&formid=6be0265c-152a-f111-ba23-0afff212cc87' +
    '&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939' +
    '&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939';

const MONTH_NAMES = [
    '',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const CONFIGS_TO_TEST = [
    {
        config: 'A',
        field: FIELD_MAP.A.field,
        isLegacy: false,
        isDateTime: false,
        label: 'Control (non-legacy, date-only)',
    },
    { config: 'E', field: FIELD_MAP.E.field, isLegacy: true, isDateTime: false, label: 'Legacy date-only' },
    { config: 'F', field: FIELD_MAP.F.field, isLegacy: true, isDateTime: false, label: 'Legacy date-only + ignoreTZ' },
    { config: 'G', field: FIELD_MAP.G.field, isLegacy: true, isDateTime: true, label: 'Legacy DateTime' },
    { config: 'H', field: FIELD_MAP.H.field, isLegacy: true, isDateTime: true, label: 'Legacy DateTime + ignoreTZ' },
];

async function waitForVVForm(page) {
    await page.goto(BASE_URL + FORM_TEMPLATE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => typeof VV !== 'undefined' && VV.Form && VV.Form.VV && VV.Form.VV.FormPartition, {
        timeout: 30000,
    });
}

async function captureValues(page, fieldName) {
    return page.evaluate((name) => {
        const raw = VV.Form.VV.FormPartition.getValueObjectValue(name);
        const api = VV.Form.GetFieldValue(name);
        return { raw, api };
    }, fieldName);
}

async function verifyPreconditions(page) {
    const isV2 = await page.evaluate(() => VV.Form.calendarValueService.useUpdatedCalendarValueLogic);
    const tzCheck = await page.evaluate(() => new Date().toString());
    return { isV2, tzCheck };
}

/**
 * Open Kendo popup for legacy field via cal-icon click, select a date.
 * Works because legacy fields use the same Kendo calendar widget, just with a different toggle.
 */
async function selectDateViaLegacyPopup(page, fieldName, year, month, day) {
    // Click the cal-icon span inside the d-picker container
    const clicked = await page.evaluate((name) => {
        const input = document.querySelector(`#${name}`);
        if (!input) return { error: 'Input not found' };
        const container = input.closest('.d-picker');
        if (!container) return { error: 'No .d-picker container' };
        const icon = container.querySelector('.cal-icon');
        if (!icon) return { error: 'No .cal-icon' };
        icon.click();
        return { clicked: true };
    }, fieldName);

    if (clicked.error) throw new Error(`Legacy popup open failed: ${clicked.error}`);

    // Wait for kendo-popup to appear
    await page.waitForSelector('kendo-popup', { state: 'visible', timeout: 5000 });

    // Navigate to the target month using the scrollable month list
    const monthShort = MONTH_NAMES[month].substring(0, 3);
    const targetHeader = `${MONTH_NAMES[month]} ${year}`;

    await page.evaluate(
        ({ monthAbbr }) => {
            const listItems = document.querySelectorAll('kendo-popup li');
            for (const li of listItems) {
                if (li.textContent.trim() === monthAbbr) {
                    li.scrollIntoView();
                    li.click();
                    return;
                }
            }
        },
        { monthAbbr: monthShort }
    );

    // Wait for target month tbody
    await page.waitForFunction(
        (header) => {
            const tbodies = document.querySelectorAll('kendo-popup tbody');
            return [...tbodies].some((tb) => {
                const firstRow = tb.querySelector('tr');
                return firstRow && firstRow.textContent.includes(header);
            });
        },
        targetHeader,
        { timeout: 5000 }
    );

    // Click the target day
    const dayClicked = await page.evaluate(
        ({ targetDay, targetHeader: th }) => {
            const tbodies = document.querySelectorAll('kendo-popup tbody');
            for (const tbody of tbodies) {
                const firstRow = tbody.querySelector('tr');
                if (!firstRow || !firstRow.textContent.includes(th)) continue;
                const cells = tbody.querySelectorAll('td');
                for (const cell of cells) {
                    if (cell.textContent.trim() === String(targetDay)) {
                        const span = cell.querySelector('span') || cell.querySelector('div');
                        if (span) span.click();
                        else cell.click();
                        return true;
                    }
                }
            }
            return false;
        },
        { targetDay: day, targetHeader }
    );

    if (!dayClicked) throw new Error(`Day ${day} not found in ${targetHeader}`);

    // Wait for value to be stored
    await page.waitForFunction(
        (name) => {
            const val = VV.Form.VV.FormPartition.getValueObjectValue(name);
            return val !== null && val !== undefined && val !== '';
        },
        fieldName,
        { timeout: 5000 }
    );
}

/**
 * Open Kendo popup for non-legacy field via Toggle calendar button, select a date.
 */
async function selectDateViaNonLegacyPopup(page, fieldName, year, month, day) {
    const fieldContainer = await page.locator(`[aria-label="${fieldName}"]`);
    await fieldContainer.scrollIntoViewIfNeeded();
    const toggleBtn = fieldContainer.locator('[aria-label="Toggle calendar"]');
    await toggleBtn.click();

    const monthShort = MONTH_NAMES[month].substring(0, 3);
    const targetHeader = `${MONTH_NAMES[month]} ${year}`;

    await page.evaluate(
        ({ monthAbbr }) => {
            const listItems = document.querySelectorAll('[role="grid"] li');
            for (const li of listItems) {
                if (li.textContent.trim() === monthAbbr) {
                    li.scrollIntoView();
                    li.click();
                    return;
                }
            }
        },
        { monthAbbr: monthShort }
    );

    await page.waitForFunction(
        (header) => {
            const tbodies = document.querySelectorAll('[role="grid"] tbody');
            return [...tbodies].some((tb) => {
                const firstRow = tb.querySelector('tr');
                return firstRow && firstRow.textContent.includes(header);
            });
        },
        targetHeader,
        { timeout: 5000 }
    );

    const dayClicked = await page.evaluate(
        ({ targetDay, targetHeader: th }) => {
            const tbodies = document.querySelectorAll('[role="grid"] tbody');
            for (const tbody of tbodies) {
                const firstRow = tbody.querySelector('tr');
                if (!firstRow || !firstRow.textContent.includes(th)) continue;
                const cells = tbody.querySelectorAll('td');
                for (const cell of cells) {
                    if (cell.textContent.trim() === String(targetDay)) {
                        const span = cell.querySelector('span') || cell.querySelector('div');
                        if (span) span.click();
                        else cell.click();
                        return true;
                    }
                }
            }
            return false;
        },
        { targetDay: day, targetHeader }
    );

    if (!dayClicked) throw new Error(`Day ${day} not found in ${targetHeader}`);

    await page.waitForFunction(
        (name) => {
            const val = VV.Form.VV.FormPartition.getValueObjectValue(name);
            return val !== null && val !== undefined && val !== '';
        },
        fieldName,
        { timeout: 5000 }
    );
}

/**
 * Type a date into a field (works for both legacy and non-legacy).
 */
async function typeDateInField(page, fieldName, dateStr, isLegacy) {
    if (isLegacy) {
        const input = page.locator(`#${fieldName}`);
        await input.scrollIntoViewIfNeeded();
        await input.fill(dateStr);
        await page.keyboard.press('Tab');
    } else {
        const fieldContainer = page.locator(`[aria-label="${fieldName}"]`);
        await fieldContainer.scrollIntoViewIfNeeded();
        const input = fieldContainer.locator('input').first();
        await input.click();
        const parts = dateStr.split(/[/ :]/);
        for (const part of parts) {
            await page.keyboard.type(part);
        }
        await page.keyboard.press('Tab');
    }

    await page.waitForFunction(
        (name) => {
            const val = VV.Form.VV.FormPartition.getValueObjectValue(name);
            return val !== null && val !== undefined && val !== '';
        },
        fieldName,
        { timeout: 5000 }
    );
}

// ====== MAIN ======
(async () => {
    console.log('Bug #2 Audit — Legacy Popup vs Typed Input');
    console.log('='.repeat(60));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        timezoneId: 'America/Sao_Paulo',
        storageState: AUTH_STATE_PATH,
    });

    const results = [];

    for (const cfg of CONFIGS_TO_TEST) {
        console.log(`\n--- Config ${cfg.config}: ${cfg.label} (${cfg.field}) ---`);

        // ===== POPUP TEST =====
        console.log('  [POPUP] Opening fresh form...');
        const popupPage = await context.newPage();
        await waitForVVForm(popupPage);
        const prePopup = await verifyPreconditions(popupPage);
        console.log(`  [POPUP] V1=${!prePopup.isV2}, TZ=${prePopup.tzCheck.match(/GMT[+-]\d{4}/)?.[0]}`);

        let popupValues;
        try {
            if (cfg.isLegacy) {
                await selectDateViaLegacyPopup(popupPage, cfg.field, 2026, 3, 15);
            } else {
                await selectDateViaNonLegacyPopup(popupPage, cfg.field, 2026, 3, 15);
            }
            popupValues = await captureValues(popupPage, cfg.field);
            console.log(`  [POPUP] raw: ${JSON.stringify(popupValues.raw)}`);
            console.log(`  [POPUP] api: ${JSON.stringify(popupValues.api)}`);
        } catch (e) {
            console.log(`  [POPUP] ERROR: ${e.message}`);
            popupValues = { raw: `ERROR: ${e.message}`, api: `ERROR: ${e.message}` };
        }
        await popupPage.close();

        // ===== TYPED TEST =====
        const dateStr = cfg.isDateTime ? '03/15/2026 12:00 AM' : '03/15/2026';
        console.log(`  [TYPED] Opening fresh form...`);
        const typedPage = await context.newPage();
        await waitForVVForm(typedPage);

        let typedValues;
        try {
            await typeDateInField(typedPage, cfg.field, dateStr, cfg.isLegacy);
            typedValues = await captureValues(typedPage, cfg.field);
            console.log(`  [TYPED] raw: ${JSON.stringify(typedValues.raw)}`);
            console.log(`  [TYPED] api: ${JSON.stringify(typedValues.api)}`);
        } catch (e) {
            console.log(`  [TYPED] ERROR: ${e.message}`);
            typedValues = { raw: `ERROR: ${e.message}`, api: `ERROR: ${e.message}` };
        }
        await typedPage.close();

        // ===== COMPARISON =====
        const rawMatch = popupValues.raw === typedValues.raw;
        const apiMatch = popupValues.api === typedValues.api;
        const bug2Present = !rawMatch || !apiMatch;
        console.log(`  [COMPARE] raw match: ${rawMatch}, api match: ${apiMatch}`);
        console.log(
            `  [RESULT] Bug #2: ${bug2Present ? 'CONFIRMED — formats differ' : 'NOT PRESENT — formats identical'}`
        );

        results.push({
            config: cfg.config,
            field: cfg.field,
            label: cfg.label,
            isLegacy: cfg.isLegacy,
            popupRaw: popupValues.raw,
            popupApi: popupValues.api,
            typedRaw: typedValues.raw,
            typedApi: typedValues.api,
            rawMatch,
            apiMatch,
            bug2: bug2Present,
        });
    }

    await browser.close();

    // ===== SUMMARY =====
    console.log('\n' + '='.repeat(60));
    console.log('AUDIT SUMMARY — Bug #2: Inconsistent User Input Handlers');
    console.log('='.repeat(60));
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Timezone: America/Sao_Paulo (BRT)`);
    console.log(`Method: Playwright headless Chromium\n`);

    console.log(
        '| Config | Field    | Popup Raw                        | Typed Raw                | Raw Match | Bug #2 |'
    );
    console.log(
        '|--------|----------|----------------------------------|--------------------------|-----------|--------|'
    );
    for (const r of results) {
        const pr = (r.popupRaw || '').padEnd(32);
        const tr = (r.typedRaw || '').padEnd(24);
        console.log(
            `| ${r.config.padEnd(6)} | ${r.field.padEnd(8)} | ${pr} | ${tr} | ${r.rawMatch ? 'YES  ' : 'NO   '}     | ${r.bug2 ? 'YES' : 'NO '}    |`
        );
    }

    console.log('\nDetailed API comparison:');
    console.log('| Config | Popup API                        | Typed API                |');
    console.log('|--------|----------------------------------|--------------------------|');
    for (const r of results) {
        const pa = (r.popupApi || '').padEnd(32);
        const ta = (r.typedApi || '').padEnd(24);
        console.log(`| ${r.config.padEnd(6)} | ${pa} | ${ta} |`);
    }

    // Output JSON for artifact generation
    const outputPath = require('path').join(__dirname, '..', '..', 'testing', 'tmp', 'bug2-audit-results.json');
    require('fs').mkdirSync(require('path').dirname(outputPath), { recursive: true });
    require('fs').writeFileSync(
        outputPath,
        JSON.stringify({ date: new Date().toISOString(), tz: 'America/Sao_Paulo', results }, null, 2)
    );
    console.log(`\nResults saved to: ${outputPath}`);
})();
