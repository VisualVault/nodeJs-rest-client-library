/* eslint-disable no-undef */
/**
 * Audit: Kendo Widget Version Comparison (Category 15)
 *
 * Captures Kendo UI widget internals and VV form framework properties on the
 * active environment. Run on both EmanuelJofre (Kendo v1) and WADNR (Kendo v2)
 * separately, then compare the outputs to identify any date-related divergence.
 *
 * This is NOT a regression test — it captures environment state for cross-env
 * differential analysis. All tests PASS by design (data collection mode).
 *
 * Differences found here inform whether formal regression categories are needed.
 *
 * Environment matrix:
 *   - EmanuelJofre (vvdemo): kendoVariant=v1, progVersion=5.1, FormViewer=20260304.1
 *   - WADNR (vv5dev):        kendoVariant=v2, progVersion=6.1, FormViewer=20260404.1
 */
const { test, expect } = require('@playwright/test');
const { FIELD_MAP, FORM_TEMPLATE_URL } = require('../../fixtures/vv-config');
const { gotoAndWaitForVVForm, setFieldValue } = require('../../helpers/vv-form');

// Only run on BRT-chromium — pure JS logic, one TZ/browser is sufficient
test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('BRT'), 'Audit runs in BRT only');
    test.skip(!testInfo.project.name.endsWith('-chromium'), 'Audit runs on chromium only');
    await gotoAndWaitForVVForm(page, FORM_TEMPLATE_URL);
});

// ═══════════════════════════════════════════════════════════════════════
// Phase 1: VV Form Framework Properties
// ═══════════════════════════════════════════════════════════════════════
// Captures VV.Form-level properties that may differ between platform versions.

test.describe('Phase 1: VV Form Framework', () => {
    test('VV.Form core properties', async ({ page }) => {
        const props = await page.evaluate(() => ({
            formId: VV.Form.formId,
            formIdType: typeof VV.Form.formId,
            useUpdatedCalendarValueLogic: VV.Form.calendarValueService.useUpdatedCalendarValueLogic,
            calendarValueServiceMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(VV.Form.calendarValueService))
                .filter((m) => m !== 'constructor')
                .sort(),
            hasLocalizationResources: 'LocalizationResources' in VV.Form,
            localizationResourcesType: typeof VV.Form.LocalizationResources,
            localizationResourcesKeys: VV.Form.LocalizationResources
                ? Object.keys(VV.Form.LocalizationResources).sort()
                : null,
            vvFormPropertyCount: Object.keys(VV.Form).length,
            vvFormProperties: Object.keys(VV.Form).sort(),
        }));

        // Record all values as test annotations for the run file
        test.info().annotations.push({ type: 'audit-data', description: JSON.stringify(props, null, 2) });

        // Basic structural assertions (should pass on both envs)
        expect(typeof props.useUpdatedCalendarValueLogic).toBe('boolean');
        expect(props.calendarValueServiceMethods.length).toBeGreaterThan(0);
    });

    test('fieldMaster entry for Config D (Field5) — full property dump', async ({ page }) => {
        const fieldEntry = await page.evaluate((fieldName) => {
            const field = Object.values(VV.Form.VV.FormPartition.fieldMaster).find((f) => f.name === fieldName);
            if (!field) return null;
            // Capture all enumerable properties
            const props = {};
            for (const key of Object.keys(field).sort()) {
                const val = field[key];
                // Skip circular references and DOM elements
                if (typeof val === 'function' || val instanceof HTMLElement) continue;
                try {
                    JSON.stringify(val);
                    props[key] = val;
                } catch {
                    props[key] = `[${typeof val}]`;
                }
            }
            return props;
        }, FIELD_MAP.D.field);

        test.info().annotations.push({ type: 'audit-data', description: JSON.stringify(fieldEntry, null, 2) });
        expect(fieldEntry).not.toBeNull();
        expect(fieldEntry.enableTime).toBe(true);
        expect(fieldEntry.ignoreTimezone).toBe(true);
    });

    test('fieldMaster entry for Config C (Field6) — full property dump', async ({ page }) => {
        const fieldEntry = await page.evaluate((fieldName) => {
            const field = Object.values(VV.Form.VV.FormPartition.fieldMaster).find((f) => f.name === fieldName);
            if (!field) return null;
            const props = {};
            for (const key of Object.keys(field).sort()) {
                const val = field[key];
                if (typeof val === 'function' || val instanceof HTMLElement) continue;
                try {
                    JSON.stringify(val);
                    props[key] = val;
                } catch {
                    props[key] = `[${typeof val}]`;
                }
            }
            return props;
        }, FIELD_MAP.C.field);

        test.info().annotations.push({ type: 'audit-data', description: JSON.stringify(fieldEntry, null, 2) });
        expect(fieldEntry).not.toBeNull();
        expect(fieldEntry.enableTime).toBe(true);
        expect(fieldEntry.ignoreTimezone).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════
// Phase 2: Kendo Widget Internals
// ═══════════════════════════════════════════════════════════════════════
// Captures Kendo widget-level properties (format, parseFormats, culture)
// and compares widget behavior between v1 and v2.

test.describe('Phase 2: Kendo Widget Internals', () => {
    test('Kendo version and global kendo object', async ({ page }) => {
        const kendoInfo = await page.evaluate(() => ({
            kendoVersion: typeof kendo !== 'undefined' ? kendo.version : null,
            hasCulture: typeof kendo !== 'undefined' && !!kendo.culture,
            cultureName: typeof kendo !== 'undefined' && kendo.culture ? kendo.culture().name : null,
            cultureCalendar:
                typeof kendo !== 'undefined' && kendo.culture ? kendo.culture().calendars?.standard?.patterns : null,
        }));

        test.info().annotations.push({ type: 'audit-data', description: JSON.stringify(kendoInfo, null, 2) });
        expect(kendoInfo.kendoVersion).not.toBeNull();
    });

    test('DateTimePicker widget options for Config D (Field5)', async ({ page }) => {
        const widgetOpts = await page.evaluate((fieldName) => {
            // Try both Kendo v1 and v2 selector patterns
            const input =
                document.querySelector(`[name="${fieldName}"]`) ||
                document.querySelector(`input[aria-label="${fieldName}"]`);
            if (!input) return { error: 'input not found' };

            const widget = $(input).data('kendoDateTimePicker') || $(input).data('kendoDatePicker');
            if (!widget) return { error: 'no kendo widget found', inputRole: input.getAttribute('role') };

            return {
                widgetType: widget.options.name,
                format: widget.options.format,
                parseFormats: widget.options.parseFormats,
                min: widget.options.min ? widget.options.min.toISOString() : null,
                max: widget.options.max ? widget.options.max.toISOString() : null,
                culture: widget.options.culture,
                dateInput: widget.options.dateInput,
                componentType: widget.options.componentType,
                inputRole: input.getAttribute('role'),
                inputType: input.getAttribute('type'),
            };
        }, FIELD_MAP.D.field);

        test.info().annotations.push({ type: 'audit-data', description: JSON.stringify(widgetOpts, null, 2) });
        // Widget should exist on both envs
        expect(widgetOpts.error).toBeUndefined();
    });

    test('DatePicker widget options for Config A (Field7) — date-only', async ({ page }) => {
        const widgetOpts = await page.evaluate((fieldName) => {
            const input =
                document.querySelector(`[name="${fieldName}"]`) ||
                document.querySelector(`input[aria-label="${fieldName}"]`);
            if (!input) return { error: 'input not found' };

            const widget = $(input).data('kendoDatePicker') || $(input).data('kendoDateTimePicker');
            if (!widget) return { error: 'no kendo widget found', inputRole: input.getAttribute('role') };

            return {
                widgetType: widget.options.name,
                format: widget.options.format,
                parseFormats: widget.options.parseFormats,
                culture: widget.options.culture,
                dateInput: widget.options.dateInput,
                componentType: widget.options.componentType,
                inputRole: input.getAttribute('role'),
            };
        }, FIELD_MAP.A.field);

        test.info().annotations.push({ type: 'audit-data', description: JSON.stringify(widgetOpts, null, 2) });
        expect(widgetOpts.error).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════
// Phase 3: Kendo Date Parsing and Formatting
// ═══════════════════════════════════════════════════════════════════════
// Tests kendo.parseDate() and kendo.toString() directly to check for
// version-specific parsing differences.

const PARSE_CASES = [
    { input: '2026-03-15', label: 'ISO date-only' },
    { input: '2026-03-15T00:00:00', label: 'ISO datetime no Z' },
    { input: '2026-03-15T00:00:00.000Z', label: 'ISO datetime with Z' },
    { input: '03/15/2026', label: 'US format' },
    { input: '03/15/2026 02:30 PM', label: 'US format with time' },
];

test.describe('Phase 3: Kendo Date Parsing', () => {
    for (const tc of PARSE_CASES) {
        test(`kendo.parseDate("${tc.input}") — ${tc.label}`, async ({ page }) => {
            const result = await page.evaluate((input) => {
                const parsed = kendo.parseDate(input);
                if (!parsed) return { parsed: null };
                return {
                    parsed: true,
                    toString: parsed.toString(),
                    toISOString: parsed.toISOString(),
                    getTime: parsed.getTime(),
                    getFullYear: parsed.getFullYear(),
                    getMonth: parsed.getMonth(),
                    getDate: parsed.getDate(),
                    getHours: parsed.getHours(),
                    getMinutes: parsed.getMinutes(),
                };
            }, tc.input);

            test.info().annotations.push({
                type: 'audit-data',
                description: JSON.stringify({ input: tc.input, ...result }, null, 2),
            });
            // Just record — don't assert specific values (they may legitimately differ)
            expect(result).toBeDefined();
        });
    }
});

test.describe('Phase 3b: Kendo Date Formatting', () => {
    test('kendo.toString() with known Date object', async ({ page }) => {
        const result = await page.evaluate(() => {
            // Create a fixed date: March 15, 2026 14:30:00 local time
            const d = new Date(2026, 2, 15, 14, 30, 0);
            return {
                sourceEpoch: d.getTime(),
                sourceToString: d.toString(),
                formats: {
                    'yyyy-MM-dd': kendo.toString(d, 'yyyy-MM-dd'),
                    'MM/dd/yyyy': kendo.toString(d, 'MM/dd/yyyy'),
                    'yyyy-MM-ddTHH:mm:ss': kendo.toString(d, 'yyyy-MM-ddTHH:mm:ss'),
                    'MM/dd/yyyy hh:mm tt': kendo.toString(d, 'MM/dd/yyyy hh:mm tt'),
                    G: kendo.toString(d, 'G'), // General (culture-specific)
                    d: kendo.toString(d, 'd'), // Short date (culture-specific)
                },
            };
        });

        test.info().annotations.push({ type: 'audit-data', description: JSON.stringify(result, null, 2) });
        expect(result.formats['yyyy-MM-dd']).toBe('2026-03-15');
    });
});

// ═══════════════════════════════════════════════════════════════════════
// Phase 4: Widget Value After SetFieldValue
// ═══════════════════════════════════════════════════════════════════════
// Sets a value via VV.Form.SetFieldValue(), then captures BOTH the VV
// raw/api values AND the Kendo widget's internal .value().

test.describe('Phase 4: Widget Value After SetFieldValue', () => {
    test('Config D (DateTime+iTZ) — SetFieldValue then capture widget internals', async ({ page }) => {
        const fieldName = FIELD_MAP.D.field;
        await setFieldValue(page, fieldName, '2026-03-15T14:30:00');

        const result = await page.evaluate((fn) => {
            const raw = VV.Form.VV.FormPartition.getValueObjectValue(fn);
            const api = VV.Form.GetFieldValue(fn);
            const input =
                document.querySelector(`[name="${fn}"]`) || document.querySelector(`input[aria-label="${fn}"]`);
            const widget = input ? $(input).data('kendoDateTimePicker') || $(input).data('kendoDatePicker') : null;
            const widgetVal = widget ? widget.value() : null;

            return {
                vvRaw: raw,
                vvApi: api,
                widgetValue: widgetVal
                    ? {
                          toString: widgetVal.toString(),
                          toISOString: widgetVal.toISOString(),
                          getTime: widgetVal.getTime(),
                      }
                    : null,
                displayValue: input ? input.value : null,
            };
        }, fieldName);

        test.info().annotations.push({ type: 'audit-data', description: JSON.stringify(result, null, 2) });
        expect(result.vvRaw).toBeDefined();
    });

    test('Config C (DateTime) — SetFieldValue then capture widget internals', async ({ page }) => {
        const fieldName = FIELD_MAP.C.field;
        await setFieldValue(page, fieldName, '2026-03-15T14:30:00');

        const result = await page.evaluate((fn) => {
            const raw = VV.Form.VV.FormPartition.getValueObjectValue(fn);
            const api = VV.Form.GetFieldValue(fn);
            const input =
                document.querySelector(`[name="${fn}"]`) || document.querySelector(`input[aria-label="${fn}"]`);
            const widget = input ? $(input).data('kendoDateTimePicker') || $(input).data('kendoDatePicker') : null;
            const widgetVal = widget ? widget.value() : null;

            return {
                vvRaw: raw,
                vvApi: api,
                widgetValue: widgetVal
                    ? {
                          toString: widgetVal.toString(),
                          toISOString: widgetVal.toISOString(),
                          getTime: widgetVal.getTime(),
                      }
                    : null,
                displayValue: input ? input.value : null,
            };
        }, fieldName);

        test.info().annotations.push({ type: 'audit-data', description: JSON.stringify(result, null, 2) });
        expect(result.vvRaw).toBeDefined();
    });

    test('Config A (date-only) — SetFieldValue then capture widget internals', async ({ page }) => {
        const fieldName = FIELD_MAP.A.field;
        await setFieldValue(page, fieldName, '2026-03-15');

        const result = await page.evaluate((fn) => {
            const raw = VV.Form.VV.FormPartition.getValueObjectValue(fn);
            const api = VV.Form.GetFieldValue(fn);
            const input =
                document.querySelector(`[name="${fn}"]`) || document.querySelector(`input[aria-label="${fn}"]`);
            const widget = input ? $(input).data('kendoDatePicker') || $(input).data('kendoDateTimePicker') : null;
            const widgetVal = widget ? widget.value() : null;

            return {
                vvRaw: raw,
                vvApi: api,
                widgetValue: widgetVal
                    ? {
                          toString: widgetVal.toString(),
                          toISOString: widgetVal.toISOString(),
                          getTime: widgetVal.getTime(),
                      }
                    : null,
                displayValue: input ? input.value : null,
            };
        }, fieldName);

        test.info().annotations.push({ type: 'audit-data', description: JSON.stringify(result, null, 2) });
        expect(result.vvRaw).toBeDefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════
// Phase 5: Mask Property Presence
// ═══════════════════════════════════════════════════════════════════════
// Checks whether the fieldMaster entries have mask-related properties
// and what their default values are on this environment.

test.describe('Phase 5: Mask Properties in fieldMaster', () => {
    test('scan all calendar fields for mask-related properties', async ({ page }) => {
        const result = await page.evaluate(() => {
            const fields = Object.values(VV.Form.VV.FormPartition.fieldMaster).filter((f) => f.fieldType === 13);
            return fields.map((f) => ({
                name: f.name,
                enableTime: f.enableTime,
                ignoreTimezone: f.ignoreTimezone,
                useLegacy: f.useLegacy,
                mask: f.mask || null,
                placeholder: f.placeholder || null,
                format: f.format || null,
                displayFormat: f.displayFormat || null,
                // Capture any property with 'mask' or 'format' in the name
                maskRelated: Object.keys(f)
                    .filter((k) => k.toLowerCase().includes('mask') || k.toLowerCase().includes('format'))
                    .reduce((acc, k) => {
                        acc[k] = f[k];
                        return acc;
                    }, {}),
            }));
        });

        test.info().annotations.push({ type: 'audit-data', description: JSON.stringify(result, null, 2) });
        expect(result.length).toBeGreaterThan(0);
    });
});
