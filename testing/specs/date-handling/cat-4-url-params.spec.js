/**
 * Category 4 — URL Parameter Input Tests
 *
 * Open the TargetDateTest form with date values pre-filled via URL query string params.
 * Tests how enableQListener fields process URL parameters through initCalendarValueV1.
 *
 * Requires: TargetDateTest form (enableQListener=true on all fields).
 *
 * Key findings from smoke tests:
 *   - Date-only configs (A, B, E, F) do NOT exhibit FORM-BUG-7 via URL params,
 *     even in IST — unlike SetFieldValue which triggers FORM-BUG-7 in UTC+ zones.
 *   - DateTime configs (C, D, G, H) with Z suffix all strip Z from raw storage (FORM-BUG-1).
 *     Config C recovers correct UTC in API return; Config D does not (adds fake Z via Bug #5).
 *   - Legacy configs work with enableQListener but don't render value in the input widget.
 *
 * Test cases are defined in ../fixtures/test-data.js and filtered by category.
 * Each test runs only in its matching timezone project (BRT, IST, or UTC0).
 */
const { test, expect } = require('@playwright/test');
const { FIELD_MAP, TARGET_FORM_TEMPLATE_URL } = require('../../fixtures/vv-config');
const { TEST_DATA } = require('../../fixtures/test-data');
const { getCodePath, getBrowserTimezone, captureFieldValues, gotoWithUrlParams } = require('../../helpers/vv-form');

const categoryTests = TEST_DATA.filter((t) => t.category === 4 && t.action === 'urlParam');

for (const tc of categoryTests) {
    test.describe(`TC-${tc.id}: ${tc.categoryName}, Config ${tc.config}`, () => {
        test(`URL param ${tc.urlParamValue} stores correctly`, async ({ page }, testInfo) => {
            // Only run this test in the matching timezone project
            test.skip(!testInfo.project.name.startsWith(tc.tz), `Skipping — test is for ${tc.tz}`);

            const fieldCfg = FIELD_MAP[tc.config];

            // Navigate to TargetDateTest form with URL parameter
            await gotoWithUrlParams(page, TARGET_FORM_TEMPLATE_URL, {
                [fieldCfg.field]: tc.urlParamValue,
            });

            // Verify timezone matches expected
            const dateStr = await getBrowserTimezone(page);
            expect(dateStr).toContain(tc.tzOffset);

            // Verify code path (V1 vs V2)
            const isV2 = await getCodePath(page);
            expect(isV2).toBe(false); // All current tests assume V1

            // Capture and verify stored values
            const values = await captureFieldValues(page, fieldCfg.field);

            // Normalize raw value for comparison — VV may return a Date object or string
            const rawStr =
                values.raw === null || values.raw === undefined
                    ? '(empty)'
                    : typeof values.raw === 'object' && values.raw instanceof Date
                      ? values.raw.toISOString()
                      : String(values.raw);

            const apiStr =
                values.api === null || values.api === undefined
                    ? '(empty)'
                    : typeof values.api === 'object' && values.api instanceof Date
                      ? values.api.toISOString()
                      : String(values.api);

            expect(rawStr).toBe(tc.expectedRaw);
            expect(apiStr).toBe(tc.expectedApi);
        });
    });
}
