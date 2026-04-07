# FORM-BUG-3: Form Load Ignores Field Configuration, Uses Hardcoded Settings

## What Happens

When a form loads saved data or preset dates, the date parsing function receives **hardcoded parameter values** instead of reading the field's actual configuration. This means a date-only field can be processed as if it were a date+time field (preserving an unwanted time component), or a date+time field can be processed as if it were date-only (discarding the intended time).

For example, a date-only field loading a saved value is told "this field has time enabled" — so the time component from the database value leaks through instead of being collapsed to midnight. A date+time field loading a preset default is told "this field is date-only" — so the preset's time is discarded.

---

## When This Applies

Two conditions must both be true:

### 1. The form must be running a specific version of the calendar loading code

The FormViewer's calendar initialization has two versions. **V1** is the default — it ran during all testing on the demo environment. **V2** is an updated version that activates under specific conditions (see [Background](#background)). The hardcoded parameters exist in V2's initialization function; V1 uses different inline code with its own implicit hardcoding that manifests through other bugs.

We do not know what system-level configuration controls V2 activation in other environments.

### 2. The value must be loaded from saved data or a preset default

V2's initialization function calls `parseDateString()` in three scenarios. Two of the three call sites pass wrong parameters:

| Load Scenario        | Parameters Passed                                             | Correct?              |
| -------------------- | ------------------------------------------------------------- | --------------------- |
| **URL query string** | Actual field settings (`enableTime`, `ignoreTimezone`)        | ✅ Correct            |
| **Saved data**       | `enableTime` hardcoded to `true`, `ignoreTimezone` from field | ❌ Wrong `enableTime` |
| **Preset default**   | Both hardcoded: `enableTime=false`, `ignoreTimezone=true`     | ❌ Both wrong         |

All field configurations are affected — the hardcoded values override whatever the field is actually configured to do.

---

## Severity: MEDIUM

V2's activation scope is uncertain — on the demo environment, the flag was `false` (V1 active) and could not be naturally triggered. The V2 init path could not be end-to-end tested because the flag resets on page reload (see [Test Evidence](#v2-activation-limitation)). The defect is code-confirmed and functionally verified via direct `parseDateString()` invocation, but not observed through the full V2 init flow.

When V2 is active, every form load for every calendar field would be affected — the hardcoded parameters apply to all configurations.

---

## How to Reproduce

The V2 init path cannot be triggered via console because the flag resets on reload. Reproduction requires either a valid Object View context or the server-side flag enabled. The defect was verified by calling `parseDateString()` directly with the hardcoded vs correct parameters:

1. Open the DateTest form template URL
2. In the browser console, compare the two parameter sets:

    ```javascript
    // Saved data path — hardcoded enableTime=true (wrong for date-only Config A)
    VV.Form.calendarValueService.parseDateString('2026-03-15', true, false);
    // Returns: "2026-03-15T00:00:00.000Z" — time component preserved

    // Correct parameters for Config A (enableTime=false)
    VV.Form.calendarValueService.parseDateString('2026-03-15', false, false);
    // Returns: "2026-03-14T03:00:00.000Z" — collapsed to midnight (also wrong — FORM-BUG-7)
    ```

3. The results differ — confirming the hardcoded parameter changes the output

**Note**: The "correct" parameter produces a wrong result too (FORM-BUG-7). See [Critical Dependency](#critical-dependency-fixing-this-bug-would-expose-form-bug-7).

This bug report is backed by a supporting test repository containing Playwright automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## Background

This section explains what `parseDateString()` does with its parameters — context needed to understand why hardcoded values matter.

`parseDateString(value, enableTime, ignoreTimezone)` uses two flags to decide how to parse:

- `enableTime=true` → preserves the full time component
- `enableTime=false` → collapses to midnight (`.startOf("day")`)
- `ignoreTimezone=true` → parses as local time
- `ignoreTimezone=false` → attempts a UTC-to-local conversion

When the wrong flags are passed, the parsing behavior doesn't match the field's intended type — a date-only field gets DateTime parsing, or a DateTime field gets date-only parsing.

For the full V1/V2 explanation, see [FORM-BUG-1 Background](bug-1-timezone-stripping.md#background).

---

## The Problem in Detail

### Three Call Sites, Two Are Wrong

The V2 initialization function `initCalendarValueV2()` calls `parseDateString()` in three scenarios. One uses the correct field settings; two use hardcoded values:

**1. URL query string path — CORRECT:**

```javascript
parseDateString(this.data.text, this.data.enableTime, this.data.ignoreTimezone);
//                               ✓ actual setting      ✓ actual setting
```

**2. Saved data path — HARDCODED `enableTime`:**

```javascript
parseDateString(this.data.value, true, this.data.ignoreTimezone);
//                                ✗ hardcoded true   ✓ actual setting
```

A date-only field (`enableTime=false`) loading saved data is told `enableTime=true` — the `.startOf("day")` step is skipped, and the time component from the database value leaks through.

**3. Preset date path — BOTH HARDCODED:**

```javascript
parseDateString(this.data.initialDate, false, true);
//                                      ✗ hardcoded false   ✗ hardcoded true
```

A date+time field (`enableTime=true`) loading a preset is told `enableTime=false` — the preset's time component is discarded. A field with `ignoreTimezone=false` is told `true` — the UTC recovery logic is skipped.

### Concrete Examples

**Date-only field (Config A, `enableTime=false`), loading saved value `"2026-03-15"`:**

| Parameter      | Should Be | Hardcoded Value   | Effect                                                                |
| -------------- | --------- | ----------------- | --------------------------------------------------------------------- |
| enableTime     | `false`   | **`true`**        | `.startOf("day")` is NOT applied — time from DB parsing leaks through |
| ignoreTimezone | `false`   | `false` (correct) | N/A                                                                   |

With correct parameters: `parseDateString("2026-03-15", false, false)` → collapses to midnight, produces a clean date.
With hardcoded parameters: `parseDateString("2026-03-15", true, false)` → preserves full datetime, produces a different result.

### Verified Output Comparison

Direct `parseDateString()` invocation in São Paulo (UTC-3) confirms the hardcoded parameters produce different results:

| Input                        | Scenario                   | Hardcoded Result             | Correct Result               | Match  |
| ---------------------------- | -------------------------- | ---------------------------- | ---------------------------- | ------ |
| `"2026-03-15"`               | Date-only saved (Config A) | `"2026-03-15T00:00:00.000Z"` | `"2026-03-14T03:00:00.000Z"` | **No** |
| `"2026-03-15T00:00:00"`      | DateTime preset (Config C) | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | **No** |
| `"2026-03-15T03:00:00.000Z"` | Legacy-stored UTC          | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | Yes    |

The mismatch for date-only and DateTime fields is definitive. Some inputs (UTC-suffixed strings) coincidentally produce identical results.

**Date+time field (Config C, `enableTime=true`, `ignoreTimezone=false`), loading a preset:**

| Parameter      | Should Be | Hardcoded Value | Effect                                             |
| -------------- | --------- | --------------- | -------------------------------------------------- |
| enableTime     | `true`    | **`false`**     | `.startOf("day")` IS applied — preset time is lost |
| ignoreTimezone | `false`   | **`true`**      | UTC recovery logic skipped — value parsed as local |

### Critical Dependency: Fixing This Bug Would Expose FORM-BUG-7

The hardcoded `enableTime=true` on the saved data path has an unintended positive side effect: it **accidentally prevents [FORM-BUG-7](bug-7-wrong-day-utc-plus.md)** from appearing on the V2 load path.

When `parseDateString` receives a date-only string like `"2026-03-15"` with `enableTime=true`, it skips the `.startOf("day")` call and preserves the full datetime — producing a correct date. But with the "fixed" parameter `enableTime=false`, the function collapses to local midnight — and for UTC+ users, local midnight is the previous UTC day, storing March 14 instead of March 15 (this is FORM-BUG-7).

| parseDateString("2026-03-15", ...) | enableTime         | Result in São Paulo          | Correct Date?   |
| ---------------------------------- | ------------------ | ---------------------------- | --------------- |
| Current (hardcoded)                | `true` (hardcoded) | `"2026-03-15T00:00:00.000Z"` | **Yes**         |
| "Fixed" (actual setting)           | `false` (actual)   | `"2026-03-14T03:00:00.000Z"` | **No** (-1 day) |

**Fixing FORM-BUG-3 without fixing FORM-BUG-7 first would introduce wrong dates on the V2 load path.** The fix order must be:

1. Fix FORM-BUG-7 (date-only local-midnight parsing) first
2. Then fix FORM-BUG-3 (hardcoded parameters) — now safe because the underlying parsing is correct

### Relationship to Other Bugs

| Bug        | Relationship                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FORM-BUG-1 | `parseDateString()` is where FORM-BUG-1's Z-stripping happens. FORM-BUG-3 controls which parameters reach that function — wrong parameters can mask or amplify FORM-BUG-1's effects. |
| FORM-BUG-7 | The hardcoded `enableTime=true` accidentally prevents FORM-BUG-7 on the V2 saved data path. Fixing FORM-BUG-3 alone would expose FORM-BUG-7. Fix order matters.                      |

---

## Verification

Verified on the demo environment at `vvdemo.visualvault.com` in São Paulo/BRT (UTC-3) and Mumbai/IST (UTC+5:30). `parseDateString()` was invoked directly via browser console with hardcoded vs correct parameters — output comparison confirms the two parameter sets produce materially different results for date-only saved data and DateTime presets (see [Verified Output Comparison](#verified-output-comparison) above).

**V2 init path limitation**: The V2 init path could not be end-to-end tested because the `useUpdatedCalendarValueLogic` flag resets on page reload. Console activation works for post-load operations (confirmed in [TC-8-V2](../test-cases/tc-8-V2.md) for GetFieldValue), but the init path requires the flag to be `true` before the form loads. FORM-BUG-3 is **code-confirmed + functionally verified via direct invocation, not end-to-end tested**.

**V1 regression baseline**: Category 3 (server reload) V1 regression — 18 tests across 2 timezones, 10 PASS / 8 FAIL. All failures are attributable to other bugs: FORM-BUG-7 (date-only cross-TZ), FORM-BUG-4 (Z stripped on save), FORM-BUG-5 (literal Z), FORM-BUG-1 (Z-stripping on load). No failures specific to FORM-BUG-3 — consistent with V1 not calling `parseDateString()`.

This bug report is backed by a supporting test repository containing Playwright automation scripts, database comparison scripts, per-test results, and raw test data. Access can be requested from the Solution Architecture team.

---

## Technical Root Cause

The defective code is shown in [Three Call Sites, Two Are Wrong](#three-call-sites-two-are-wrong) above. This section adds file locations.

**File**: `main.js` (bundled FormViewer application)
**Function**: `initCalendarValueV2()` — lines ~102932–102958

Three call sites to `parseDateString()`:

- **Line ~102935**: URL query string — correct parameters
- **Line ~102939**: Saved data — `enableTime` hardcoded to `true`
- **Line ~102948**: Preset date — both `enableTime` and `ignoreTimezone` hardcoded

V1 (`initCalendarValueV1()`) does not call `parseDateString()` — it handles each case with inline code. The inline code also has implicit hardcoding (e.g., the date-only branch always uses `moment(e).toDate()` regardless of `ignoreTimezone`), but those effects manifest as other bugs ([FORM-BUG-7](bug-7-wrong-day-utc-plus.md), [FORM-BUG-1](bug-1-timezone-stripping.md)).

---

## Appendix: Field Configuration Reference

The test form has 8 field configurations referred to by letter throughout this document:

| Config | Field   | enableTime | ignoreTimezone | useLegacy | Description                 |
| ------ | ------- | ---------- | -------------- | --------- | --------------------------- |
| A      | Field7  | —          | —              | —         | Date-only baseline          |
| B      | Field10 | —          | ✅             | —         | Date-only + ignoreTZ        |
| C      | Field6  | ✅         | —              | —         | DateTime UTC (control)      |
| D      | Field5  | ✅         | ✅             | —         | DateTime + ignoreTZ         |
| E      | Field12 | —          | —              | ✅        | Legacy date-only            |
| F      | Field11 | —          | ✅             | ✅        | Legacy date-only + ignoreTZ |
| G      | Field14 | ✅         | —              | ✅        | Legacy DateTime             |
| H      | Field13 | ✅         | ✅             | ✅        | Legacy DateTime + ignoreTZ  |

---

## Workarounds and Fix Recommendations

See [bug-3-fix-recommendations.md](bug-3-fix-recommendations.md) for workarounds, proposed code fix, fix ordering constraints, and fix impact assessment.
