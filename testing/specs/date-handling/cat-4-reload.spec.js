/**
 * Category 4 — URL Parameter Save/Reload Tests
 *
 * Verifies that URL-param-sourced values persist correctly after save + full page reload.
 * Saves actual records to the TargetDateTest form in vvdemo.
 *
 * Two test types:
 *   - urlParamReload: open TargetDateTest with URL param → save → reload → verify
 *   - fillinRelateReload: source GFV → target URL param → save → reload → verify
 *
 * These tests confirm:
 *   - Clean values survive the server round-trip
 *   - Bug-affected values (FORM-BUG-1 + FORM-BUG-5 compound) are locked into the DB
 *   - enableQListener does not interfere on reload (saved record URLs have no field params)
 *
 * Test cases defined in ../fixtures/test-data.js, filtered by category=4 + action contains 'Reload'.
 */
const { test, expect } = require('@playwright/test');
const { FIELD_MAP, FORM_TEMPLATE_URL, TARGET_FORM_TEMPLATE_URL } = require('../../fixtures/vv-config');
const { TEST_DATA } = require('../../fixtures/test-data');
const {
    gotoAndWaitForVVForm,
    getCodePath,
    getBrowserTimezone,
    captureFieldValues,
    setFieldValue,
    getFieldValue,
    gotoWithUrlParams,
    saveFormAndReload,
} = require('../../helpers/vv-form');

const reloadTests = TEST_DATA.filter(
    (t) => t.category === 4 && (t.action === 'urlParamReload' || t.action === 'fillinRelateReload')
);

for (const tc of reloadTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`URL param value persists after save+reload`, async ({ page }, testInfo) => {
            test.skip(!testInfo.project.name.startsWith(tc.tz), `Skipping — test is for ${tc.tz}`);

            // Increase timeout — save+reload adds ~15s
            test.setTimeout(90_000);

            const fieldCfg = FIELD_MAP[tc.config];
            let targetField;
            let sourceGfv;

            if (tc.action === 'fillinRelateReload') {
                // ── Phase 1: Source form — set value and capture GFV ──
                const sourceCfg = FIELD_MAP[tc.sourceConfig];
                targetField = FIELD_MAP[tc.targetConfig].field;

                await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);

                const dateStr = await getBrowserTimezone(page);
                expect(dateStr).toContain(tc.tzOffset);

                await setFieldValue(page, sourceCfg.field, tc.inputDateStr);

                const sourceValues = await captureFieldValues(page, sourceCfg.field);
                const sourceRaw =
                    sourceValues.raw === null || sourceValues.raw === undefined ? '(empty)' : String(sourceValues.raw);
                sourceGfv =
                    sourceValues.api === null || sourceValues.api === undefined ? '(empty)' : String(sourceValues.api);

                expect.soft(sourceRaw, 'Source raw').toBe(tc.expectedSourceRaw);
                expect.soft(sourceGfv, 'Source GFV').toBe(tc.expectedSourceGfv);
            } else {
                // Direct URL param — use the configured value
                targetField = fieldCfg.field;
                sourceGfv = tc.urlParamValue;
            }

            // ── Phase 2: Target form — open with URL param ──
            const targetCfg = tc.targetConfig ? FIELD_MAP[tc.targetConfig] : fieldCfg;
            const targetFieldName = tc.targetConfig ? targetCfg.field : targetField;

            await gotoWithUrlParams(page, TARGET_FORM_TEMPLATE_URL, {
                [targetFieldName]: sourceGfv,
            });

            const dateStr = await getBrowserTimezone(page);
            expect(dateStr).toContain(tc.tzOffset);

            const isV2 = await getCodePath(page);
            expect(isV2).toBe(false);

            // Verify pre-save values match Cat 4 expectations
            const preSave = await captureFieldValues(page, targetFieldName);
            const preSaveRaw = preSave.raw === null || preSave.raw === undefined ? '(empty)' : String(preSave.raw);
            expect.soft(preSaveRaw, 'Pre-save raw').toBe(tc.expectedRaw);

            // ── Phase 3: Save and reload ──
            const { dataId } = await saveFormAndReload(page);
            expect(dataId).toBeTruthy();

            // ── Phase 4: Verify post-reload values ──
            const postReload = await captureFieldValues(page, targetFieldName);
            const postRaw =
                postReload.raw === null || postReload.raw === undefined ? '(empty)' : String(postReload.raw);
            const postApi =
                postReload.api === null || postReload.api === undefined ? '(empty)' : String(postReload.api);

            expect(postRaw, 'Post-reload raw').toBe(tc.expectedRaw);
            expect(postApi, 'Post-reload API').toBe(tc.expectedApi);
        });
    });
}
