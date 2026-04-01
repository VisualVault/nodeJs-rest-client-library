/**
 * Generic helpers for VV form Playwright tests.
 *
 * All VV.Form calls run inside page.evaluate() — they execute in the browser context,
 * not in Node.js. The VV object is injected by the VisualVault FormViewer Angular SPA.
 *
 * Key VV objects used:
 *   VV.Form.VV.FormPartition.fieldMaster  — map of all form fields with their config flags
 *   VV.Form.VV.FormPartition.getValueObjectValue(name)  — raw stored value (what goes to the DB)
 *   VV.Form.GetFieldValue(name)  — developer-facing API return (may differ from raw due to bugs)
 *   VV.Form.SetFieldValue(name, value)  — set a field value programmatically
 *   VV.Form.calendarValueService.useUpdatedCalendarValueLogic  — V1 (false) vs V2 (true) code path
 */

/**
 * Navigate to a VV form URL and wait for the Angular SPA + VV.Form to fully load.
 *
 * Uses `networkidle` because VV's Angular SPA loads in stages — the initial HTML
 * fires `load` quickly, but the Angular app bootstraps asynchronously and populates
 * VV.Form only after several XHR calls complete. Without `networkidle`, the
 * waitForFunction check runs against a page where VV is still undefined.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} url - relative or absolute URL (playwright.config.js provides baseURL)
 * @param {number} [timeout=60000] - max wait in ms (VV forms can take 10-15s to load)
 */
async function gotoAndWaitForVVForm(page, url, timeout = 60000) {
    await page.goto(url, { waitUntil: 'networkidle', timeout });
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

/**
 * Wait for VV form framework to be fully loaded.
 * Use this after the page is already navigated (e.g., after a reload or SPA navigation).
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=30000]
 */
async function waitForVVForm(page, timeout = 30000) {
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

/**
 * Check whether the V2 calendar code path is active.
 *
 * VV has two init paths gated by `useUpdatedCalendarValueLogic`:
 *   false (default) = V1 — all current bug analysis is based on this path
 *   true = V2 — intended successor, partially fixes Bug #7 but not for ignoreTimezone fields
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>} true if V2 is active
 */
async function getCodePath(page) {
    return page.evaluate(() => VV.Form.calendarValueService.useUpdatedCalendarValueLogic);
}

/**
 * Verify that a field with the expected configuration flags exists on the form.
 *
 * Queries VV.Form.VV.FormPartition.fieldMaster (the form's field registry) for
 * calendar fields (fieldType === 13) matching the given boolean flags.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} config - field configuration flags
 * @param {boolean} config.enableTime - true for datetime fields, false for date-only
 * @param {boolean} config.ignoreTimezone - VV's timezone handling flag
 * @param {boolean} config.useLegacy - true for V1 legacy save/load code path
 * @param {boolean} config.enableInitialValue - true for Preset Date / Current Date fields
 * @returns {Promise<string>} field name (e.g., "DataField7")
 * @throws if no matching field is found on the form
 */
async function verifyField(page, config) {
    const fields = await page.evaluate(
        (cfg) =>
            Object.values(VV.Form.VV.FormPartition.fieldMaster)
                .filter(
                    (f) =>
                        f.fieldType === 13 && // 13 = calendar/date field type in VV's field type enum
                        f.enableTime === cfg.enableTime &&
                        f.ignoreTimezone === cfg.ignoreTimezone &&
                        f.useLegacy === cfg.useLegacy &&
                        f.enableInitialValue === cfg.enableInitialValue
                )
                .map((f) => f.name),
        config
    );
    if (fields.length === 0) throw new Error('No field matches config: ' + JSON.stringify(config));
    return fields[0];
}

/**
 * Capture the raw stored value and GetFieldValue API return for a field.
 *
 * - `raw` = what's stored in VV's internal value object (goes to the database)
 * - `api` = what GetFieldValue() returns to developers (may differ due to Bug #5 fake Z)
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldName - e.g., "DataField7"
 * @returns {Promise<{raw: string, api: string}>}
 */
async function captureFieldValues(page, fieldName) {
    return page.evaluate((name) => {
        return {
            raw: VV.Form.VV.FormPartition.getValueObjectValue(name),
            api: VV.Form.GetFieldValue(name),
        };
    }, fieldName);
}

/**
 * Call VV.Form.SetFieldValue() to programmatically set a field value.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldName
 * @param {string} value - date string in the format VV expects (varies by config)
 */
async function setFieldValue(page, fieldName, value) {
    await page.evaluate(({ name, val }) => VV.Form.SetFieldValue(name, val), { name: fieldName, val: value });
}

/**
 * Call VV.Form.GetFieldValue() to read a field's value via the developer API.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldName
 * @returns {Promise<string>} the field value as returned by VV's GetFieldValue API
 */
async function getFieldValue(page, fieldName) {
    return page.evaluate((name) => VV.Form.GetFieldValue(name), fieldName);
}

/**
 * Get the browser's timezone string for verification.
 * Returns the full Date.toString() output which includes the GMT offset and timezone name.
 * Example: "Wed Apr 01 2026 08:20:58 GMT-0300 (Brasilia Standard Time)"
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
async function getBrowserTimezone(page) {
    return page.evaluate(() => new Date().toString());
}

module.exports = {
    gotoAndWaitForVVForm,
    waitForVVForm,
    getCodePath,
    verifyField,
    captureFieldValues,
    setFieldValue,
    getFieldValue,
    getBrowserTimezone,
};
