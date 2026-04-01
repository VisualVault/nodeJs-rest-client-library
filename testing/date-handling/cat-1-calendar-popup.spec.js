/**
 * Category 1 — Calendar Popup Tests
 *
 * User selects a date via the calendar popup widget.
 * Verifies that VV correctly stores the raw value and returns it via GetFieldValue().
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
const { selectDateViaPopup } = require('../helpers/vv-calendar');

const categoryTests = TEST_DATA.filter((t) => t.category === 1);

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`select ${tc.inputDate.month}/${tc.inputDate.day}/${tc.inputDate.year} via popup`, async ({
            page,
        }, testInfo) => {
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

            // Select date via calendar popup
            await selectDateViaPopup(page, fieldCfg.field, tc.inputDate.year, tc.inputDate.month, tc.inputDate.day);

            // Capture and verify stored values
            const values = await captureFieldValues(page, fieldCfg.field);
            expect(values.raw).toBe(tc.expectedRaw);
            expect(values.api).toBe(tc.expectedApi);
        });
    });
}
