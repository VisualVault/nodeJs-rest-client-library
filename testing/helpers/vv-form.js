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
 * @returns {Promise<string>} field name (e.g., "Field7")
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
 * @param {string} fieldName - e.g., "Field7"
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
 * VV processes SetFieldValue asynchronously via component messages. By default,
 * this helper waits for the raw stored value to be populated before returning.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldName
 * @param {string} value - date string in the format VV expects (varies by config)
 * @param {Object} [options]
 * @param {boolean} [options.waitForValue=true] - wait for getValueObjectValue to be non-empty
 */
async function setFieldValue(page, fieldName, value, { waitForValue = true } = {}) {
    await page.evaluate(({ name, val }) => VV.Form.SetFieldValue(name, val), { name: fieldName, val: value });
    if (waitForValue) {
        await page.waitForFunction(
            (name) => {
                const val = VV.Form.VV.FormPartition.getValueObjectValue(name);
                return val !== null && val !== undefined && val !== '';
            },
            fieldName,
            { timeout: 5000 }
        );
    }
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

/**
 * Capture the visible display value from a date field's input element.
 *
 * This reads what the user sees on screen — the formatted date string in the
 * spinbutton input (e.g., "03/15/2026" or "03/15/2026 12:00 AM"). This differs
 * from `captureFieldValues` which reads VV's internal raw and API values.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldName - e.g., "Field7"
 * @returns {Promise<string>} the visible input value
 */
async function captureDisplayValue(page, fieldName) {
    const fieldContainer = page.locator(`[aria-label="${fieldName}"]`);
    return fieldContainer.locator('input').first().inputValue();
}

/**
 * Save the current VV form without reloading. Returns the DataID and saved record URL.
 *
 * Clicks the Save button and waits for VV.Form.DataID to be populated — this is
 * the reliable indicator that the save completed (the page URL does NOT reliably
 * update with the DataID, but the JS property does).
 *
 * Used by global-setup.js to create records for cross-TZ tests without the overhead
 * of a full page reload.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=60000] - max wait in ms (VV saves can take 5-10s)
 * @returns {Promise<{dataId: string, url: string}>} the DataID GUID and saved record URL path
 */
async function saveFormOnly(page, timeout = 60000) {
    // Write policy guard — extract template ID from the browser and validate before clicking Save.
    // This is the sole chokepoint for all Playwright form saves (saveFormAndReload calls this too).
    const { assertFormWriteAllowed } = require('../fixtures/write-policy');
    const templateId = await page.evaluate(() => {
        // eslint-disable-next-line no-undef -- runs in browser context via page.evaluate()
        const urlFormId = new URLSearchParams(window.location.search).get('formid');
        return (
            VV.Form.formId ||
            (VV.Form.VV && VV.Form.VV.FormPartition && VV.Form.VV.FormPartition.FormId) ||
            urlFormId ||
            ''
        ).toLowerCase();
    });
    const isNewRecord = await page.evaluate(() => {
        const dataId = VV.Form.DataID || '';
        const formId = (VV.Form.formId || '').toLowerCase();
        return !dataId || dataId.toLowerCase() === formId;
    });
    assertFormWriteAllowed(templateId, isNewRecord ? 'create' : 'update');

    // Capture the pre-save DataID — on template forms, this is the formId (e.g., "6be0265c-...").
    // After save, VV.Form.DataID changes to the new record's DataID.
    const preSaveId = await page.evaluate(() => VV.Form.DataID || '');

    const saveBtn = page.locator('button.btn-save[aria-label="Save"]');
    await saveBtn.click();

    // Wait for DataID to change from its pre-save value — this confirms the save completed
    // and VV assigned a new DataID to the saved record.
    await page.waitForFunction((oldId) => VV.Form.DataID && VV.Form.DataID !== oldId, preSaveId, { timeout });

    return page.evaluate(() => ({
        dataId: VV.Form.DataID,
        url:
            `/FormViewer/app?DataID=${VV.Form.DataID}&hidemenu=true&rOpener=1` +
            `&xcid=${VV.Form.VV.currentUser.Xcid}&xcdid=${VV.Form.VV.currentUser.Xcdid}`,
    }));
}

/**
 * Save the current VV form and reload the saved record.
 *
 * Clicks Save, waits for VV.Form.DataID to confirm the save, then performs
 * a full page reload and waits for VV.Form to be ready again.
 *
 * The reload clears Angular SPA state, simulating a fresh page load — this is
 * what Categories 3, 5, 6, 9, 11 need to test server round-trip behavior.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=60000] - max wait in ms (VV saves can take 5-10s)
 * @returns {Promise<{savedUrl: string, dataId: string}>}
 */
async function saveFormAndReload(page, timeout = 60000) {
    const { dataId, url: savedUrl } = await saveFormOnly(page, timeout);

    // Full reload to clear Angular SPA state and simulate a fresh page load
    await page.reload({ waitUntil: 'networkidle', timeout });
    await page.waitForFunction(
        () =>
            typeof VV !== 'undefined' &&
            VV.Form &&
            VV.Form.VV &&
            VV.Form.VV.FormPartition &&
            VV.Form.VV.FormPartition.fieldMaster,
        { timeout }
    );

    return { savedUrl, dataId };
}

/**
 * Run N round-trip cycles of GetFieldValue → SetFieldValue and capture values after each.
 *
 * Used to detect cumulative drift caused by Bug #5 (fake Z suffix). Each cycle reads
 * the field value via GetFieldValue(), feeds it back via SetFieldValue(), then captures
 * the raw, API, and display values. In BRT, Bug #5 causes -3h drift per trip; in IST,
 * +5:30h per trip.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldName - e.g., "Field5"
 * @param {number} [times=3] - number of round-trip cycles
 * @returns {Promise<Array<{trip: number, raw: string, api: string, display: string}>>}
 */
async function roundTripCycle(page, fieldName, times = 3) {
    const results = [];
    for (let i = 0; i < times; i++) {
        const apiValue = await page.evaluate((name) => VV.Form.GetFieldValue(name), fieldName);

        await page.evaluate(({ name, val }) => VV.Form.SetFieldValue(name, val), { name: fieldName, val: apiValue });

        const raw = await page.evaluate((name) => VV.Form.VV.FormPartition.getValueObjectValue(name), fieldName);
        const api = await page.evaluate((name) => VV.Form.GetFieldValue(name), fieldName);
        // Legacy fields (useLegacy=true) render as plain <input aria-label="...">, not inside a Kendo wrapper.
        const container = page.locator(`[aria-label="${fieldName}"]`);
        const tagName = await container.evaluate((el) => el.tagName.toLowerCase());
        const input = tagName === 'input' ? container : container.locator('input').first();
        const display = await input.inputValue();

        results.push({ trip: i + 1, raw, api, display });
    }
    return results;
}

/**
 * Build a URL with query-string field params and navigate to the form.
 *
 * Used for Category 4 (URL parameter input) tests. Appends field=value pairs
 * to the form template URL, then navigates and waits for VV.Form to load.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} templateUrl - relative form template URL (e.g., TARGET_FORM_TEMPLATE_URL)
 * @param {Object<string, string>} fieldParams - { fieldName: value } pairs to append as query params
 * @param {number} [timeout=60000]
 */
async function gotoWithUrlParams(page, templateUrl, fieldParams, timeout = 60000) {
    const params = Object.entries(fieldParams)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    const url = `${templateUrl}&${params}`;
    await gotoAndWaitForVVForm(page, url, timeout);
    // URL parameters are processed during Angular init — wait briefly for value propagation
    await page.waitForTimeout(1500);
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
    captureDisplayValue,
    saveFormOnly,
    saveFormAndReload,
    roundTripCycle,
    gotoWithUrlParams,
};
