/**
 * Category 6 — Current Date Default Tests
 *
 * Open a fresh form template (not a saved record). The Current Date field auto-populates
 * with today's date on load via `new Date()` → UTC timestamp.
 *
 * Unlike other categories, expected values are DYNAMIC — they depend on today's date.
 * The test verifies that:
 *   1. The raw value is a Date object (not a string)
 *   2. The local date interpretation matches today's date in the test timezone
 *   3. GetFieldValue returns the same value (no transformation)
 *
 * Test cases are defined in ../fixtures/test-data.js and filtered by category.
 * Each test runs only in its matching timezone project (BRT, IST, or UTC0).
 */
const { test, expect } = require('@playwright/test');
const { FIELD_MAP, FORM_TEMPLATE_URL } = require('../../fixtures/vv-config');
const { TEST_DATA } = require('../../fixtures/test-data');
const { gotoAndWaitForVVForm, getCodePath, getBrowserTimezone } = require('../../helpers/vv-form');

const categoryTests = TEST_DATA.filter((t) => t.category === 6);

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`current date auto-populates correctly in ${tc.tz}`, async ({ page }, testInfo) => {
            // Only run this test in the matching timezone project
            test.skip(!testInfo.project.name.startsWith(tc.tz), `Skipping — test is for ${tc.tz}`);

            const fieldCfg = FIELD_MAP[tc.config];

            // Open fresh form template — current date auto-populates
            await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);

            // Verify timezone matches expected
            const dateStr = await getBrowserTimezone(page);
            expect(dateStr).toContain(tc.tzOffset);

            // Verify code path (V1 vs V2)
            const isV2 = await getCodePath(page);
            expect(isV2).toBe(false); // All current tests assume V1

            // Verify current date field exists and is auto-populated
            const currentDateField = fieldCfg.currentDate;
            const fieldResult = await page.evaluate((name) => {
                const fields = Object.values(VV.Form.VV.FormPartition.fieldMaster);
                return fields.some((f) => f.name === name && f.fieldType === 13);
            }, currentDateField);
            expect(fieldResult).toBe(true);

            // Capture the auto-populated value
            const values = await page.evaluate((name) => {
                const raw = VV.Form.VV.FormPartition.getValueObjectValue(name);
                const api = VV.Form.GetFieldValue(name);
                const now = new Date();
                return {
                    rawIsDate: raw instanceof Date,
                    rawIso: raw instanceof Date ? raw.toISOString() : String(raw),
                    apiIso: api instanceof Date ? api.toISOString() : String(api),
                    // Get today's date in the browser's local timezone (MM/dd/yyyy)
                    todayLocal: now.toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                    }),
                    // Get the raw value's date in local timezone
                    rawLocalDate:
                        raw instanceof Date
                            ? raw.toLocaleDateString('en-US', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  year: 'numeric',
                              })
                            : null,
                };
            }, currentDateField);

            // Raw value should be a Date object (not a string)
            expect(values.rawIsDate).toBe(true);

            // The local date interpretation of the stored Date should match today
            expect(values.rawLocalDate).toBe(values.todayLocal);

            // API return should match raw (no transformation for date-only fields)
            expect(values.apiIso).toBe(values.rawIso);
        });
    });
}
