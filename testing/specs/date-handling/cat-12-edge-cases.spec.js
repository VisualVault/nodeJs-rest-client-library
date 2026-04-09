/**
 * Category 12 — Edge Cases
 *
 * Boundary conditions, timezone controls, and special inputs that stress
 * date handling logic at extremes. Most tests are GFV round-trips at
 * specific boundary values (near midnight, year boundary, UTC+0 control).
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

const categoryTests = TEST_DATA.filter((t) => t.category === 12);

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`${tc.id} — ${tc.notes.substring(0, 60)}`, async ({ page }, testInfo) => {
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
            expect(isV2).toBe(false);

            // Verify field
            const fieldName = await verifyField(page, {
                enableTime: fieldCfg.enableTime,
                ignoreTimezone: fieldCfg.ignoreTimezone,
                useLegacy: fieldCfg.useLegacy,
                enableInitialValue: false,
            });
            expect(fieldName).toBe(fieldCfg.field);

            // Set baseline value (skip wait for empty/invalid inputs that won't populate)
            const waitForValue = tc.inputDateStr !== '' && tc.inputDateStr !== 'not-a-date';
            await setFieldValue(page, fieldCfg.field, tc.inputDateStr, { waitForValue });

            // Execute round-trip(s) if specified
            if (tc.action === 'gfvRoundTrip' && tc.trips) {
                await roundTripCycle(page, fieldCfg.field, tc.trips);
            }

            // Verify final values
            const values = await captureFieldValues(page, fieldCfg.field);
            expect(values.raw).toBe(tc.expectedRaw);
            expect(values.api).toBe(tc.expectedApi);
        });
    });
}
