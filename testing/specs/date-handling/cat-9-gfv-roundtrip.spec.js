/**
 * Category 9 — GFV Round-Trip Tests (SetFieldValue → GetFieldValue → SetFieldValue)
 *
 * Execute N cycles of: read value via GetFieldValue(), feed it back via SetFieldValue().
 * Tests whether Bug #5 (fake Z suffix on Config D) causes cumulative drift.
 * Legacy configs (useLegacy=true) should show zero drift since GFV returns raw value.
 *
 * Test cases are defined in ../fixtures/test-data.js and filtered by category.
 * Each test runs only in its matching timezone project (BRT, IST, or UTC0).
 */
const { test, expect } = require('@playwright/test');
const { FIELD_MAP, FORM_TEMPLATE_URL } = require('../../fixtures/vv-config');
const { TEST_DATA } = require('../../fixtures/test-data');
const {
    gotoAndWaitForVVForm,
    getCodePath,
    verifyField,
    setFieldValue,
    getBrowserTimezone,
    captureFieldValues,
    roundTripCycle,
} = require('../../helpers/vv-form');

const categoryTests = TEST_DATA.filter((t) => t.category === 9);

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`GFV round-trip ${tc.trips} trip(s) on ${tc.inputDateStr}`, async ({ page }, testInfo) => {
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

            // Set baseline value
            await setFieldValue(page, fieldCfg.field, tc.inputDateStr);

            // Execute GFV round-trip(s)
            await roundTripCycle(page, fieldCfg.field, tc.trips || 1);

            // After all trips, verify the raw value matches expected
            const finalValues = await captureFieldValues(page, fieldCfg.field);
            expect(finalValues.raw).toBe(tc.expectedRaw);
            expect(finalValues.api).toBe(tc.expectedApi);
        });
    });
}
