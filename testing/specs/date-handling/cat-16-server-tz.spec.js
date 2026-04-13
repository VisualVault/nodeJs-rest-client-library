/**
 * Category 16 — Server TZ on Form Save
 *
 * Does the VV server UTC offset affect the form save→reload→API-read pipeline?
 * Cross-environment comparison: vvdemo (server BRT) vs vv5dev (server PDT).
 *
 * The typed/SFV tests verify that getForms API returns the same value on both envs.
 * The controls tests verify that reload-after-save preserves values identically.
 *
 * Test cases are defined in ../fixtures/test-data.js and filtered by category.
 * Each test runs in BRT timezone (client side) — the variable is server TZ, not client TZ.
 *
 * API read tests (expectedApiServer field) are only verifiable via manual API call
 * or a dedicated API test script — they're not automated here.
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
const { typeDateInField } = require('../../helpers/vv-calendar');

const categoryTests = TEST_DATA.filter((t) => t.category === 16);

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`${tc.action} on Config ${tc.config} (server TZ test)`, async ({ page }, testInfo) => {
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
            expect(isV2).toBe(false);

            // Verify field exists with expected config flags
            const fieldName = await verifyField(page, {
                enableTime: fieldCfg.enableTime,
                ignoreTimezone: fieldCfg.ignoreTimezone,
                useLegacy: fieldCfg.useLegacy,
                enableInitialValue: false,
            });
            expect(fieldName).toBe(fieldCfg.field);

            // Execute the test action
            if (tc.action === 'typed') {
                await typeDateInField(page, fieldCfg.field, tc.inputDateStr);
            } else if (tc.action === 'setFieldValue') {
                await setFieldValue(page, fieldCfg.field, tc.sfvInput);
            } else if (tc.action === 'reload') {
                // Controls tests: set value, save, reload, verify
                await setFieldValue(page, fieldCfg.field, tc.inputDateStr);
                await page.waitForTimeout(500);
                await saveFormAndReload(page);
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
