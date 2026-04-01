/**
 * Category 9-GDOC — Round-Trip via GetDateObjectFromCalendar
 *
 * Execute: SetFieldValue(field, GetDateObjectFromCalendar(field).toISOString())
 * Verify raw stored value after the round-trip matches expected.
 *
 * Unlike GFV round-trips (Bug #5 fake Z → progressive drift), GDOC round-trips
 * use real UTC from .toISOString(), which normalizeCalValue correctly parses
 * back to local time. Tests whether this produces zero drift or a shift.
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

const categoryTests = TEST_DATA.filter((t) => t.category === '9-GDOC');

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`GDOC round-trip ${tc.trips} trip(s) on ${tc.inputDateStr}`, async ({ page }, testInfo) => {
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

            // Execute GDOC round-trip(s)
            const trips = tc.trips || 1;
            for (let i = 0; i < trips; i++) {
                await page.evaluate((fName) => {
                    const d = VV.Form.GetDateObjectFromCalendar(fName);
                    VV.Form.SetFieldValue(fName, d.toISOString());
                }, fieldCfg.field);
                await page.waitForTimeout(500);
            }

            // Capture and verify post-trip values
            const postTrip = await page.evaluate((fName) => {
                return {
                    raw: VV.Form.VV.FormPartition.getValueObjectValue(fName),
                    api: VV.Form.GetFieldValue(fName),
                };
            }, fieldCfg.field);

            expect(postTrip.raw).toBe(tc.expectedRaw);
        });
    });
}
