/**
 * Category 8 — GetFieldValue Return Tests
 *
 * Call GetFieldValue() on a field and verify the return value.
 * Tests format transformations, empty-field handling, and Bug #5/#6.
 *
 * Test cases are defined in ../fixtures/test-data.js and filtered by category.
 * Each test runs only in its matching timezone project (BRT, IST, or UTC0).
 */
const { test, expect } = require('@playwright/test');
const { FIELD_MAP, FORM_TEMPLATE_URL } = require('../fixtures/vv-config');
const { TEST_DATA } = require('../fixtures/test-data');
const {
    gotoAndWaitForVVForm,
    getCodePath,
    verifyField,
    captureFieldValues,
    getBrowserTimezone,
    setFieldValue,
} = require('../helpers/vv-form');

const categoryTests = TEST_DATA.filter((t) => t.category === 8);

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`GetFieldValue on ${tc.inputDate ? tc.inputDateStr : 'empty field'}`, async ({ page }, testInfo) => {
            // Only run this test in the matching timezone project
            test.skip(!testInfo.project.name.startsWith(tc.tz), `Skipping — test is for ${tc.tz}`);

            // Navigate to fresh form and wait for VV.Form ready
            await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);

            // Verify timezone matches expected
            const dateStr = await getBrowserTimezone(page);
            expect(dateStr).toContain(tc.tzOffset);

            // Verify code path (V1 vs V2)
            const isV2 = await getCodePath(page);
            const fieldCfg = FIELD_MAP[tc.config];
            expect(isV2).toBe(false); // All current tests assume V1

            // Verify field exists with expected config flags
            const fieldName = await verifyField(page, {
                enableTime: fieldCfg.enableTime,
                ignoreTimezone: fieldCfg.ignoreTimezone,
                useLegacy: fieldCfg.useLegacy,
                enableInitialValue: false,
            });
            expect(fieldName).toBe(fieldCfg.field);

            // If a value needs to be set first, set it
            if (tc.inputDate) {
                await setFieldValue(page, fieldCfg.field, tc.inputDateStr);
            }

            // Capture and verify stored values
            // Expected values reflect CORRECT behavior. Tests FAIL when bugs are present
            // (e.g., Bug #6: GetFieldValue throws or returns "Invalid Date" for empty fields).
            // Use try/catch to capture the API value even if it throws.
            const result = await page.evaluate((name) => {
                const raw = VV.Form.VV.FormPartition.getValueObjectValue(name);
                let api;
                try {
                    api = VV.Form.GetFieldValue(name);
                } catch (e) {
                    api = 'ERROR: ' + e.message;
                }
                return { raw, api };
            }, fieldCfg.field);
            expect(result.raw).toBe(tc.expectedRaw);
            expect(result.api).toBe(tc.expectedApi);
        });
    });
}
