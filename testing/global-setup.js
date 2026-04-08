/**
 * Playwright global setup — authenticates with VV and creates test records.
 *
 * Runs once before all test files. Two responsibilities:
 *
 * 1. **Auth**: Logs into VisualVault and saves browser cookies/storage to
 *    testing/config/auth-state-pw.json. Tests reuse cookies via storageState.
 *
 * 2. **Record creation**: Creates saved form records for cross-TZ tests (Category 3).
 *    Records are created through the browser UI using the same input methods users
 *    follow (popup, typed input, SetFieldValue), then saved via the Save button.
 *    DataIDs are extracted via VV.Form.DataID and written to saved-records.json.
 *
 * Both auth and records are cached for 1 hour — delete the files to force re-creation.
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { vvConfig, AUTH_STATE_PATH, FORM_TEMPLATE_URL, RECORD_DEFINITIONS } = require('./fixtures/vv-config');
const { gotoAndWaitForVVForm, setFieldValue, saveFormOnly } = require('./helpers/vv-form');
const { selectDateViaPopup, typeDateInField } = require('./helpers/vv-calendar');

const SAVED_RECORDS_PATH = path.join(__dirname, 'config', 'saved-records.json');
const BASE_URL = vvConfig.baseUrl;
const CACHE_MAX_AGE_MS = 3600_000; // 1 hour

/**
 * Check if a cached file exists and is fresh (less than maxAge ms old).
 */
function isCacheFresh(filePath, maxAge = CACHE_MAX_AGE_MS) {
    if (!fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    return Date.now() - stat.mtimeMs < maxAge;
}

/**
 * Authenticate with VV and save browser state for test reuse.
 */
async function authenticate() {
    if (isCacheFresh(AUTH_STATE_PATH)) return;

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(vvConfig.loginUrl);
    await page.getByRole('textbox', { name: 'User Name' }).fill(vvConfig.username);
    await page.getByRole('textbox', { name: 'Password' }).fill(vvConfig.password);
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.waitForURL('**/FormDataAdmin**', { timeout: 15000 });

    await context.storageState({ path: AUTH_STATE_PATH });
    await browser.close();
}

/**
 * Create saved form records for cross-TZ tests via browser UI.
 *
 * Each record is created using the input method specified in RECORD_DEFINITIONS
 * (popup, typed, setFieldValue) to exercise the same code paths users follow.
 * After saving, DataIDs are extracted via VV.Form.DataID and written to
 * saved-records.json for tests to consume.
 */
async function createRecords() {
    if (isCacheFresh(SAVED_RECORDS_PATH)) return;
    if (RECORD_DEFINITIONS.length === 0) return;

    const records = {};

    // Group by timezone to minimize browser context switches
    const byTz = {};
    for (const def of RECORD_DEFINITIONS) {
        (byTz[def.tz] ??= []).push(def);
    }

    for (const [tz, defs] of Object.entries(byTz)) {
        const browser = await chromium.launch();
        const context = await browser.newContext({
            timezoneId: tz,
            storageState: AUTH_STATE_PATH,
        });

        for (const def of defs) {
            const page = await context.newPage();
            await gotoAndWaitForVVForm(page, BASE_URL + FORM_TEMPLATE_URL);

            // Populate fields using the specified input method
            for (const field of def.fields) {
                switch (field.method) {
                    case 'popup':
                        await selectDateViaPopup(
                            page,
                            field.name,
                            field.input.year,
                            field.input.month,
                            field.input.day
                        );
                        break;
                    case 'typed':
                        await typeDateInField(page, field.name, field.value);
                        break;
                    case 'setFieldValue':
                        await setFieldValue(page, field.name, field.value);
                        break;
                }
            }

            // Save via UI button — same save path users follow
            const result = await saveFormOnly(page);
            records[def.key] = result.url;

            await page.close();
        }

        await browser.close();
    }

    fs.writeFileSync(SAVED_RECORDS_PATH, JSON.stringify(records, null, 4));
}

module.exports = async function globalSetup() {
    await authenticate();
    await createRecords();
};
