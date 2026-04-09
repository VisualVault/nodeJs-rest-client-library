/**
 * Category 7 — SetFieldValue Input Format Tests
 *
 * Pass different input formats to VV.Form.SetFieldValue() and verify stored values.
 * Tests how normalizeCalValue processes Date objects, ISO+Z, ISO-no-Z, US format, etc.
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
    getBrowserTimezone,
    captureFieldValues,
} = require('../../helpers/vv-form');

const categoryTests = TEST_DATA.filter((t) => t.category === 7);

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`SetFieldValue(${tc.sfvInputType || 'value'}) stores correctly`, async ({ page }, testInfo) => {
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

            // Execute SetFieldValue with the test input
            await page.evaluate(
                ({ field, input, inputType }) => {
                    let value;
                    if (inputType === 'Date object') {
                        // Reconstruct the Date object in the browser context
                        const parts = input.match(/new Date\((\d+),\s*(\d+),\s*(\d+)\)/);
                        value = new Date(parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3]));
                    } else if (inputType === 'Unix ms') {
                        value = parseInt(input);
                    } else {
                        value = input;
                    }
                    VV.Form.SetFieldValue(field, value);
                },
                { field: fieldCfg.field, input: tc.sfvInput, inputType: tc.sfvInputType }
            );

            // Small delay for value propagation
            await page.waitForTimeout(500);

            // Capture and verify stored values
            const values = await captureFieldValues(page, fieldCfg.field);
            expect(values.raw).toBe(tc.expectedRaw);
            expect(values.api).toBe(tc.expectedApi);
        });
    });
}
