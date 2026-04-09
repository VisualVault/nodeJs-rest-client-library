/**
 * Category 4 — FillinAndRelate Chain Tests
 *
 * Simulates the production FillinAndRelateForm pattern:
 *   1. Source form: SetFieldValue → GetFieldValue (captures what FillinAndRelate would pass)
 *   2. Target form: opened with GFV value as URL param via enableQListener
 *
 * Tests how bugs compound across the chain:
 *   - Same-config (D→D): FORM-BUG-5 + FORM-BUG-1 cancel each other
 *   - Cross-config (D→C): fake Z from source treated as real UTC by target
 *   - Date-only (A→A): FORM-BUG-7 at source propagates wrong date
 *
 * Test cases defined in ../fixtures/test-data.js, filtered by category=4 + action='fillinRelate'.
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
} = require('../../helpers/vv-form');

const chainTests = TEST_DATA.filter((t) => t.category === 4 && t.action === 'fillinRelate');

for (const tc of chainTests) {
    test.describe(`TC-${tc.id}: FillinRelate ${tc.sourceConfig}→${tc.targetConfig}`, () => {
        test(`chain preserves date correctly`, async ({ page }, testInfo) => {
            test.skip(!testInfo.project.name.startsWith(tc.tz), `Skipping — test is for ${tc.tz}`);

            const sourceCfg = FIELD_MAP[tc.sourceConfig];
            const targetCfg = FIELD_MAP[tc.targetConfig];

            // ── Step 1: Source form — set value and capture GFV ──
            await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);

            const dateStr = await getBrowserTimezone(page);
            expect(dateStr).toContain(tc.tzOffset);

            const isV2 = await getCodePath(page);
            expect(isV2).toBe(false);

            // Set value on source field
            await setFieldValue(page, sourceCfg.field, tc.inputDateStr);

            // Capture source raw + GFV (this is what FillinAndRelate would pass as URL param)
            const sourceValues = await captureFieldValues(page, sourceCfg.field);
            const sourceRaw =
                sourceValues.raw === null || sourceValues.raw === undefined ? '(empty)' : String(sourceValues.raw);
            const sourceGfv =
                sourceValues.api === null || sourceValues.api === undefined ? '(empty)' : String(sourceValues.api);

            // Verify source side
            expect.soft(sourceRaw, 'Source raw').toBe(tc.expectedSourceRaw);
            expect.soft(sourceGfv, 'Source GFV').toBe(tc.expectedSourceGfv);

            // ── Step 2: Target form — open with GFV value as URL param ──
            // This simulates FillinAndRelate: the source GFV output becomes
            // the URL parameter value for the target field.
            await gotoWithUrlParams(page, TARGET_FORM_TEMPLATE_URL, {
                [targetCfg.field]: sourceGfv,
            });

            // Verify target code path
            const targetV2 = await getCodePath(page);
            expect(targetV2).toBe(false);

            // Capture target values
            const targetValues = await captureFieldValues(page, targetCfg.field);
            const targetRaw =
                targetValues.raw === null || targetValues.raw === undefined ? '(empty)' : String(targetValues.raw);
            const targetApi =
                targetValues.api === null || targetValues.api === undefined ? '(empty)' : String(targetValues.api);

            // Verify target side
            expect(targetRaw, 'Target raw').toBe(tc.expectedRaw);
            expect(targetApi, 'Target API').toBe(tc.expectedApi);
        });
    });
}
