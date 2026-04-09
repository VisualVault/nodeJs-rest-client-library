/**
 * Category 1 — Legacy Calendar Popup Tests (Bug #2 Audit)
 *
 * Tests the calendar popup for legacy fields (useLegacy=true, Configs E-H).
 * These are intentionally separated from cat-1-calendar-popup.spec.js because
 * the legacy popup uses a different toggle mechanism (cal-icon span vs Kendo toggle button).
 *
 * Bug #2 claim: Legacy popup stores raw toISOString() (UTC datetime) while typed input
 * routes through getSaveValue() (correct format). This spec verifies the popup side.
 *
 * Test cases are defined in ../fixtures/test-data.js and filtered by category 1 + useLegacy.
 * Each test runs only in its matching timezone project (BRT, IST, or UTC0).
 */
const { test, expect } = require('@playwright/test');
const { FIELD_MAP, FORM_TEMPLATE_URL } = require('../../fixtures/vv-config');
const { TEST_DATA } = require('../../fixtures/test-data');
const {
    gotoAndWaitForVVForm,
    getCodePath,
    verifyField,
    captureFieldValues,
    getBrowserTimezone,
} = require('../../helpers/vv-form');
const { selectDateViaLegacyPopup } = require('../../helpers/vv-calendar');

// Filter to Category 1 tests that target legacy configs only
const categoryTests = TEST_DATA.filter((t) => {
    if (t.category !== 1) return false;
    const fieldCfg = FIELD_MAP[t.config];
    return fieldCfg && fieldCfg.useLegacy;
});

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config} (Legacy)`, () => {
        test(`select ${tc.inputDate.month}/${tc.inputDate.day}/${tc.inputDate.year} via legacy popup`, async ({
            page,
        }, testInfo) => {
            // Only run this test in the matching timezone project
            test.skip(!testInfo.project.name.startsWith(tc.tz), `Skipping — test is for ${tc.tz}`);

            const fieldCfg = FIELD_MAP[tc.config];

            // Navigate to fresh form and wait for VV.Form ready
            await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);

            // Verify timezone matches expected
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

            // Select date via legacy calendar popup
            await selectDateViaLegacyPopup(
                page,
                fieldCfg.field,
                tc.inputDate.year,
                tc.inputDate.month,
                tc.inputDate.day
            );

            // Capture and verify stored values
            const values = await captureFieldValues(page, fieldCfg.field);
            expect(values.raw).toBe(tc.expectedRaw);
            expect(values.api).toBe(tc.expectedApi);
        });
    });
}
