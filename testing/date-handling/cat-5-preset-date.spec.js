/**
 * Category 5 — Preset Date Default Tests
 *
 * Open a fresh form template (not a saved record). The preset field auto-populates
 * on load via initCalendarValueV1. Verify the initial value is correct for the
 * given timezone.
 *
 * Before save, preset fields store a Date object (not a string). The test captures
 * the Date's ISO representation to verify the UTC date portion is correct.
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
} = require('../helpers/vv-form');

const categoryTests = TEST_DATA.filter((t) => t.category === 5);

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`preset date loads correctly in ${tc.tz}`, async ({ page, baseURL }, testInfo) => {
            // Only run this test in the matching timezone project
            test.skip(!testInfo.project.name.startsWith(tc.tz), `Skipping — test is for ${tc.tz}`);

            const fieldCfg = FIELD_MAP[tc.config];

            // Open fresh form template — preset auto-populates
            await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);

            // Verify timezone matches expected
            const dateStr = await getBrowserTimezone(page);
            expect(dateStr).toContain(tc.tzOffset);

            // Verify code path (V1 vs V2)
            const isV2 = await getCodePath(page);
            expect(isV2).toBe(false); // All current tests assume V1

            // Verify preset field exists (enableInitialValue=true for preset fields)
            const fieldName = await verifyField(page, {
                enableTime: fieldCfg.enableTime,
                ignoreTimezone: fieldCfg.ignoreTimezone,
                useLegacy: fieldCfg.useLegacy,
                enableInitialValue: true,
            });
            expect(fieldName).toBe(fieldCfg.preset);

            // Capture preset field values (Date object serialized to ISO string by page.evaluate)
            const values = await captureFieldValues(page, fieldCfg.preset);
            expect(values.raw).toBe(tc.expectedRaw);
            expect(values.api).toBe(tc.expectedApi);
        });
    });
}
