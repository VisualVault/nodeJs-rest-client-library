/**
 * Category 8B — GetDateObjectFromCalendar Return Tests
 *
 * Call GetDateObjectFromCalendar() on a field and verify the returned Date object.
 * Tests whether GDOC avoids Bug #5 fake Z and returns correct UTC via toISOString().
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
    setFieldValue,
    getBrowserTimezone,
} = require('../helpers/vv-form');

const categoryTests = TEST_DATA.filter((t) => t.category === '8B');

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`GetDateObjectFromCalendar on ${tc.inputDateStr || 'empty field'}`, async ({ page }, testInfo) => {
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

            // Set the input value if provided
            if (tc.inputDate) {
                await setFieldValue(page, fieldCfg.field, tc.inputDateStr);
                // Small delay for value propagation
                await page.waitForTimeout(500);
            }

            // Capture GDOC results
            const gdocResult = await page.evaluate((fName) => {
                const d = VV.Form.GetDateObjectFromCalendar(fName);
                if (d === null || d === undefined) {
                    return { isDate: false, isNull: d === null, toString: String(d), toIso: null };
                }
                return {
                    isDate: d instanceof Date,
                    isNull: false,
                    toString: d.toString(),
                    toIso: d.toISOString(),
                };
            }, fieldCfg.field);

            // Assert Date object type
            expect(gdocResult.isDate).toBe(true);

            // Assert toISOString matches expected
            expect(gdocResult.toIso).toBe(tc.expectedGdocIso);

            // Assert toString contains expected substring
            if (tc.expectedGdocToStringContains) {
                expect(gdocResult.toString).toContain(tc.expectedGdocToStringContains);
            }
        });
    });
}
