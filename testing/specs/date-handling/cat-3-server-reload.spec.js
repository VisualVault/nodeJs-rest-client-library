/**
 * Category 3 — Server Reload Tests
 *
 * Save form, open saved record in a new tab. Compare displayed dates and GFV return
 * with original values. Tests value integrity through the save/load cycle.
 *
 * For same-TZ tests: set value → save → reload → verify.
 * For cross-TZ tests: use a pre-saved record (saved in a different TZ) → load → verify.
 *
 * Test cases are defined in ../fixtures/test-data.js and filtered by category.
 * Each test runs only in its matching timezone project (BRT, IST, or UTC0).
 */
const { test, expect } = require('@playwright/test');
const { FIELD_MAP, FORM_TEMPLATE_URL, SAVED_RECORDS } = require('../../fixtures/vv-config');
const { TEST_DATA } = require('../../fixtures/test-data');
const {
    gotoAndWaitForVVForm,
    getCodePath,
    verifyField,
    captureFieldValues,
    getBrowserTimezone,
    setFieldValue,
    saveFormAndReload,
} = require('../../helpers/vv-form');

const categoryTests = TEST_DATA.filter((t) => t.category === 3);

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`save/reload ${tc.inputDateStr} and verify values`, async ({ page, baseURL }, testInfo) => {
            // Only run this test in the matching timezone project
            test.skip(!testInfo.project.name.startsWith(tc.tz), `Skipping — test is for ${tc.tz}`);

            // Verify timezone matches expected
            const fieldCfg = FIELD_MAP[tc.config];

            if (tc.savedRecord && SAVED_RECORDS[tc.savedRecord]) {
                // Pre-saved record (preferred for Cat 3): load directly
                const recordPath = SAVED_RECORDS[tc.savedRecord];
                const recordUrl = `${baseURL}${recordPath}`;
                await gotoAndWaitForVVForm(page, recordUrl);
            } else {
                // Fallback: set value on fresh form, save, reload
                await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);
                await setFieldValue(page, fieldCfg.field, tc.inputDateStr); // waits for value processing
                await saveFormAndReload(page);
            }

            const dateStr = await getBrowserTimezone(page);
            expect(dateStr).toContain(tc.tzOffset);

            // Verify code path (V1 vs V2)
            const isV2 = await getCodePath(page);
            expect(isV2).toBe(false); // All current tests assume V1

            // Verify field exists with expected config flags
            const fieldName = await verifyField(page, {
                enableTime: fieldCfg.enableTime,
                ignoreTimezone: fieldCfg.ignoreTimezone,
                useLegacy: fieldCfg.useLegacy,
                enableInitialValue: false,
            });
            expect(fieldName).toBe(fieldCfg.field);

            // Capture and verify post-reload values
            const values = await captureFieldValues(page, fieldCfg.field);
            expect(values.raw).toBe(tc.expectedRaw);
            expect(values.api).toBe(tc.expectedApi);
        });
    });
}
