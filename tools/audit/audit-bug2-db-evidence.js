/**
 * Bug #2 DB Evidence Script
 *
 * Creates two saved records to prove Bug #2 causes different DB values:
 * 1. Record A: March 15 via LEGACY POPUP for Config E (Field12) + Config G (Field14)
 * 2. Record B: March 15 via TYPED INPUT for Config E (Field12) + Config G (Field14)
 *
 * After running, query the DB for the output DataIDs to compare stored values:
 *   SELECT DhDocID, Field12, Field14 FROM dbo.DateTest WHERE DhID IN ('...', '...')
 *
 * Expected:
 *   Record A (popup):  Field12 = 2026-03-15 03:00:00.000  (BRT midnight in UTC)
 *   Record B (typed):  Field12 = 2026-03-15 00:00:00.000  (midnight, tz-ambiguous)
 *
 * Usage: node tools/audit/audit-bug2-db-evidence.js
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

async function waitForVVForm(page) {
    await page.goto(BASE_URL + FORM_TEMPLATE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => typeof VV !== 'undefined' && VV.Form && VV.Form.VV && VV.Form.VV.FormPartition, {
        timeout: 30000,
    });
}

async function captureValues(page, fieldName) {
    return page.evaluate(
        (name) => ({
            raw: VV.Form.VV.FormPartition.getValueObjectValue(name),
            api: VV.Form.GetFieldValue(name),
        }),
        fieldName
    );
}

async function saveForm(page) {
    const preSaveId = await page.evaluate(() => VV.Form.DataID || '');
    await page.locator('button.btn-save[aria-label="Save"]').click();
    await page.waitForFunction((oldId) => VV.Form.DataID && VV.Form.DataID !== oldId, preSaveId, { timeout: 60000 });
    return page.evaluate(() => ({
        dataId: VV.Form.DataID,
        docId: VV.Form.VV.FormPartition.getValueObjectValue('DhDocID') || 'unknown',
    }));
}

async function selectDateViaLegacyPopup(page, fieldName, year, month, day) {
    await page.evaluate((name) => {
        const input = document.querySelector(`#${name}`);
        const container = input.closest('.d-picker');
        container.querySelector('.cal-icon').click();
    }, fieldName);

    await page.waitForSelector('kendo-popup', { state: 'visible', timeout: 5000 });

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

    await page.waitForFunction(
        (header) =>
            [...document.querySelectorAll('kendo-popup tbody')].some((tb) =>
                tb.querySelector('tr')?.textContent.includes(header)
            ),
        targetHeader,
        { timeout: 5000 }
    );

    await page.evaluate(
        ({ targetDay, th }) => {
            for (const tbody of document.querySelectorAll('kendo-popup tbody')) {
                if (!tbody.querySelector('tr')?.textContent.includes(th)) continue;
                for (const cell of tbody.querySelectorAll('td')) {
                    if (cell.textContent.trim() === String(targetDay)) {
                        (cell.querySelector('span') || cell).click();
                        return;
                    }
                }
            }
        },
        { targetDay: day, th: targetHeader }
    );

    await page.waitForFunction(
        (name) => {
            const v = VV.Form.VV.FormPartition.getValueObjectValue(name);
            return v && v !== '';
        },
        fieldName,
        { timeout: 5000 }
    );
}

async function typeDateInLegacyField(page, fieldName, dateStr) {
    const input = page.locator(`#${fieldName}`);
    await input.scrollIntoViewIfNeeded();
    await input.fill(dateStr);
    await page.keyboard.press('Tab');
    await page.waitForFunction(
        (name) => {
            const v = VV.Form.VV.FormPartition.getValueObjectValue(name);
            return v && v !== '';
        },
        fieldName,
        { timeout: 5000 }
    );
}

// ====== MAIN ======
(async () => {
    console.log('Bug #2 DB Evidence — Popup vs Typed Save Comparison');
    console.log('='.repeat(60));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        timezoneId: 'America/Sao_Paulo',
        storageState: AUTH_STATE_PATH,
    });

    // ============================================================
    // RECORD A: Legacy popup input → Save
    // ============================================================
    console.log('\n--- Record A: Legacy Popup → Save ---');
    const popupPage = await context.newPage();
    await waitForVVForm(popupPage);

    console.log('  Selecting March 15 via popup for Field12 (Config E, date-only)...');
    await selectDateViaLegacyPopup(popupPage, 'Field12', 2026, 3, 15);
    const popupE = await captureValues(popupPage, 'Field12');
    console.log(`  Field12 pre-save: raw=${JSON.stringify(popupE.raw)}`);

    console.log('  Selecting March 15 via popup for Field14 (Config G, DateTime)...');
    await selectDateViaLegacyPopup(popupPage, 'Field14', 2026, 3, 15);
    const popupG = await captureValues(popupPage, 'Field14');
    console.log(`  Field14 pre-save: raw=${JSON.stringify(popupG.raw)}`);

    console.log('  Saving...');
    const popupSave = await saveForm(popupPage);
    console.log(`  Saved! DataID: ${popupSave.dataId}`);

    // Capture post-save values
    const popupEPost = await captureValues(popupPage, 'Field12');
    const popupGPost = await captureValues(popupPage, 'Field14');
    console.log(`  Field12 post-save: raw=${JSON.stringify(popupEPost.raw)}`);
    console.log(`  Field14 post-save: raw=${JSON.stringify(popupGPost.raw)}`);
    await popupPage.close();

    // ============================================================
    // RECORD B: Typed input → Save
    // ============================================================
    console.log('\n--- Record B: Typed Input → Save ---');
    const typedPage = await context.newPage();
    await waitForVVForm(typedPage);

    console.log('  Typing 03/15/2026 for Field12 (Config E, date-only)...');
    await typeDateInLegacyField(typedPage, 'Field12', '03/15/2026');
    const typedE = await captureValues(typedPage, 'Field12');
    console.log(`  Field12 pre-save: raw=${JSON.stringify(typedE.raw)}`);

    console.log('  Typing 03/15/2026 12:00 AM for Field14 (Config G, DateTime)...');
    await typeDateInLegacyField(typedPage, 'Field14', '03/15/2026 12:00 AM');
    const typedG = await captureValues(typedPage, 'Field14');
    console.log(`  Field14 pre-save: raw=${JSON.stringify(typedG.raw)}`);

    console.log('  Saving...');
    const typedSave = await saveForm(typedPage);
    console.log(`  Saved! DataID: ${typedSave.dataId}`);

    const typedEPost = await captureValues(typedPage, 'Field12');
    const typedGPost = await captureValues(typedPage, 'Field14');
    console.log(`  Field12 post-save: raw=${JSON.stringify(typedEPost.raw)}`);
    console.log(`  Field14 post-save: raw=${JSON.stringify(typedGPost.raw)}`);
    await typedPage.close();

    await browser.close();

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('DB EVIDENCE SUMMARY');
    console.log('='.repeat(60));
    console.log(`\nPopup Record DataID:  ${popupSave.dataId}`);
    console.log(`Typed Record DataID:  ${typedSave.dataId}`);
    console.log(`\nQuery the DB to compare:`);
    console.log(`  SELECT DhDocID, DhID, Field12, Field14`);
    console.log(`  FROM dbo.DateTest`);
    console.log(`  WHERE DhID IN ('${popupSave.dataId}', '${typedSave.dataId}')`);
    console.log(`\nExpected DB values:`);
    console.log(`  Popup Field12: 2026-03-15 03:00:00.000 (BRT midnight in UTC)`);
    console.log(`  Typed Field12: 2026-03-15 00:00:00.000 (midnight, tz-ambiguous)`);
    console.log(`  Popup Field14: 2026-03-15 03:00:00.000 (BRT midnight in UTC)`);
    console.log(`  Typed Field14: 2026-03-15 00:00:00.000 (midnight, tz-ambiguous)`);
    console.log(`\nJS values comparison:`);
    console.log(`  Field12 popup raw:  ${popupE.raw}`);
    console.log(`  Field12 typed raw:  ${typedE.raw}`);
    console.log(`  Field14 popup raw:  ${popupG.raw}`);
    console.log(`  Field14 typed raw:  ${typedG.raw}`);
})();
