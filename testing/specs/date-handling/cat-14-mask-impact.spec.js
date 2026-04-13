/**
 * Category 14 — Mask Impact Tests
 *
 * Verifies that <Mask>MM/dd/yyyy</Mask> on DateTime fields does not affect
 * stored values, GetFieldValue return, or API responses. Phase A = unmasked baseline.
 *
 * Test cases are defined in ../fixtures/test-data.js and filtered by category.
 * Each test runs only in its matching timezone project (BRT).
 *
 * Actions: setFieldValue, getFieldValue, popup, typed, reload, apiRead.
 * GFV tests (14-C-GFV, 14-D-GFV) depend on a prior SFV call on the same form.
 * Save/reload tests set a value, save the form, reload it, and verify the value survived.
 * API read tests are skipped in automated runs (require manual API call verification).
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
    setFieldValue,
    saveFormAndReload,
} = require('../../helpers/vv-form');
const { selectDateViaPopup, typeDateInField } = require('../../helpers/vv-calendar');

const categoryTests = TEST_DATA.filter((t) => t.category === 14);

// Group SFV+GFV pairs that must share the same form instance.
// GFV tests read the value set by the preceding SFV test.
const sfvGfvPairs = {
    '14-C-GFV': '14-C-SFV',
    '14-D-GFV': '14-D-SFV',
};

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`${tc.action} on Config ${tc.config} (mask baseline)`, async ({ page }, testInfo) => {
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

            // Execute the test action
            if (tc.action === 'setFieldValue') {
                await setFieldValue(page, fieldCfg.field, tc.sfvInput);
            } else if (tc.action === 'getFieldValue') {
                // GFV tests: set the value first (same as the paired SFV test), then read it
                const pairedSfvId = sfvGfvPairs[tc.id];
                const sfvTc = categoryTests.find((t) => t.id === pairedSfvId);
                if (sfvTc) {
                    await setFieldValue(page, fieldCfg.field, sfvTc.sfvInput);
                }
            } else if (tc.action === 'popup') {
                await selectDateViaPopup(page, fieldCfg.field, tc.inputDate.year, tc.inputDate.month, tc.inputDate.day);
            } else if (tc.action === 'typed') {
                // Type date into the Kendo DateTimePicker
                await typeDateInField(page, fieldCfg.field, tc.inputDateStr);
            } else if (tc.action === 'reload') {
                // Save + reload: set value, save the form, reload, then verify
                await setFieldValue(page, fieldCfg.field, tc.inputDateStr);
                await page.waitForTimeout(500);
                await saveFormAndReload(page);
            } else if (tc.action === 'apiRead') {
                // API read tests: skip in automated runs (require REST API call)
                test.skip(true, 'API read tests require manual verification');
            }

            // Small delay for value propagation
            await page.waitForTimeout(500);

            // Capture and verify stored values
            const values = await captureFieldValues(page, fieldCfg.field);
            expect(values.raw).toBe(tc.expectedRaw);
            expect(values.api).toBe(tc.expectedApi);
        });
    });
}
