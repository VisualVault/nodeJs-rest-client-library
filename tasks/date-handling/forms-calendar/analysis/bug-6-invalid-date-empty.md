# FORM-BUG-6: GetFieldValue Returns Invalid Values or Crashes for Empty Date+Time Fields

## What Happens

When a developer script checks whether a calendar field has a value by reading it and testing for truthiness, the check produces incorrect results for two date+time field configurations when the field is **empty**:

- One configuration returns the string `"Invalid Date"` — a truthy, non-empty string that causes scripts to process an empty field as if it had a value
- The other configuration **throws an uncaught error** that crashes the entire script before the developer can check the value
- A third failure mode returns `"1970-01-01T00:00:00.000Z"` (the Unix epoch) — a valid-looking date that was never entered by anyone

All other field configurations correctly return an empty string for empty fields.

---

## When This Applies

Two conditions must both be true:

### 1. The field must be date+time and non-legacy

VisualVault calendar fields have three per-field configuration flags: `enableTime` (date-only vs date+time), `ignoreTimezone` (skip timezone conversion), and `useLegacy` (use older rendering/save code). See the [Appendix](#appendix-field-configuration-reference) for the full mapping of configurations to field names.

Only fields with `enableTime=true` and `useLegacy=false` are affected — these are Configs C and D in the test form. Fields with `useLegacy=true` (Configs G, H) and all date-only fields (Configs A, B, E, F) return the raw stored value before reaching the defective code, so they correctly return an empty string.

### 2. The field must be empty (or contain `null`)

The bug triggers when the field has no value. The failure mode depends on the field's `ignoreTimezone` setting and whether the stored value is an empty string or `null`:

| Config | Field   | Stored Value | GetFieldValue Returns            | Truthy? | Crashes? |
| ------ | ------- | ------------ | -------------------------------- | ------- | -------- |
| **C**  | Field6  | `""`         | **throws RangeError**            | N/A     | **Yes**  |
| **C**  | Field6  | `null`       | **`"1970-01-01T00:00:00.000Z"`** | **Yes** | No       |
| **D**  | Field5  | `""`         | **`"Invalid Date"`**             | **Yes** | No       |
| **D**  | Field5  | `null`       | **`"Invalid Date"`**             | **Yes** | No       |
| A      | Field7  | `""`         | `""`                             | No      | No       |
| G      | Field14 | `""`         | `""`                             | No      | No       |

This bug is not timezone-dependent — empty is empty everywhere.

**`null` input (confirmed 2026-04-08):** `SetFieldValue(field, null)` normalizes to empty internally, then triggers the same Bug #6 behavior as `""`. Config D returns `"Invalid Date"` for both `null` and `""` — they are not distinct inputs for this bug (TC-12-null-input).

**`useLegacy=true` confirmed safe (2026-04-08):** Config H (DateTime + ignoreTZ + legacy) returns `""` for empty fields (TC-8-H-empty). The legacy GFV path returns raw values before reaching `getCalendarFieldValue()`, bypassing both the `moment().format()` and `new Date().toISOString()` branches. All legacy configs (E, F, G, H) are immune.

**Complete Bug #6 scope**: Config C **throws** (RangeError), Config D returns **truthy string** (`"Invalid Date"`), Configs A/B/E/F/G/H return `""` **correctly**.

---

## Severity: MEDIUM (Config D) / HIGH (Config C)

Config C's uncaught exception crashes scripts entirely — any form button script or event handler that reads an optional Config C field without error handling will fail on empty fields. Config D's truthy `"Invalid Date"` is harder to detect — scripts silently enter processing blocks they shouldn't, potentially corrupting data downstream.

---

## How to Reproduce

### Config D — "Invalid Date" String

1. Open the DateTest form template URL
2. Leave **Field5** (Config D: DateTime + ignoreTimezone, non-legacy) empty
3. In the browser console:

    ```javascript
    VV.Form.GetFieldValue('Field5');
    // Returns: "Invalid Date"

    // The broken conditional:
    if (VV.Form.GetFieldValue('Field5')) {
        console.log('This runs for an empty field!'); // ← THIS RUNS
    }
    ```

### Config C — RangeError Crash

1. Leave **Field6** (Config C: DateTime, non-legacy) empty
2. In the browser console:
    ```javascript
    VV.Form.GetFieldValue('Field6');
    // THROWS: RangeError: Invalid time value
    // Script execution stops here
    ```

**Expected**: Both return `""` (falsy) for empty fields, like every other configuration does.
**Actual**: Config D returns `"Invalid Date"` (truthy), Config C crashes.

This bug report is backed by a supporting test repository containing Playwright automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## The Problem in Detail

### Why Config D Returns "Invalid Date"

The function that transforms `GetFieldValue()` output uses the moment.js library to format the value. When it receives an empty string:

```javascript
moment('').format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
// → "Invalid Date"
```

`moment("")` creates an **invalid moment object**. When `.format()` is called on an invalid moment, it doesn't throw — it returns the literal string `"Invalid Date"`. This string is truthy, non-empty, and unparseable as a date.

### Why Config C Throws a RangeError

The Config C path uses native JavaScript instead of moment.js:

```javascript
new Date('').toISOString();
// → throws RangeError: Invalid time value
```

`new Date("")` creates an Invalid Date object (internal time value is `NaN`). When `.toISOString()` is called on it, JavaScript throws a `RangeError` — an uncaught exception that crashes the script.

### Why Config C with `null` Returns the Unix Epoch

When the stored value is `null` (rather than empty string):

```javascript
new Date(null).toISOString();
// → "1970-01-01T00:00:00.000Z"
```

`new Date(null)` is valid JavaScript — it creates a Date at Unix epoch (timestamp 0). The `.toISOString()` call succeeds and returns a perfectly formatted ISO string. This failure mode is the most difficult to detect: it does not crash, it returns a truthy parseable value, and the date (January 1, 1970) was never entered by anyone. Code downstream has no way to distinguish it from a real value.

### The Root Cause: No Empty Guard

The function has no check for empty/null values before the transformation code. The FormViewer has two versions of its calendar value-handling logic. **V1** is the default — it ran during all testing on the demo environment. **V2** is an updated version that returns the raw value immediately for all inputs, including empty — no bug. Within V1, the legacy path and the date-only path also return the raw value early (reaching `return value` which is `""` before any transformation). Only the V1 non-legacy date+time path falls through to the defective `moment()` / `new Date()` calls without checking for empty input first.

### Relationship to FORM-BUG-5

FORM-BUG-5 and FORM-BUG-6 share the same function, the same code path, and the same entry condition (`enableTime=true`, `useLegacy=false`). They represent different input cases:

- **FORM-BUG-5**: Populated field → literal Z added → progressive drift on round-trip
- **FORM-BUG-6**: Empty field → no value guard → "Invalid Date" or RangeError or epoch

The recommended [FORM-BUG-5 fix](bug-5-fix-recommendations.md) (return raw value for Config D) also resolves FORM-BUG-6 for Config D because `return value` for empty input returns `""`. However, the Config C path still needs the explicit empty guard regardless.

---

## Verification

Verified on the demo environment at `vvdemo.visualvault.com` using manual browser testing and automated Playwright scripts. All 8 field configurations tested with empty fields — only Configs C and D exhibit the bug. `GetDateObjectFromCalendar()` tested as a safe alternative across all configs — returns `undefined` (falsy) for all empty fields.

Overall Category 8 (GetFieldValue): 18 of 19 tests complete — 12 PASS, 6 FAIL. 4 failures are FORM-BUG-5 (literal Z on populated Config D), 2 failures are FORM-BUG-6 (empty Config C/D).

This bug report is backed by a supporting test repository containing Playwright automation scripts, per-test results, and raw test data. Access can be requested from the Solution Architecture team.

---

## Technical Root Cause

The defective code is shown in [The Root Cause: No Empty Guard](#the-root-cause-no-empty-guard) above. This section adds file locations.

**File**: `main.js` (bundled FormViewer application)
**Function**: `CalendarValueService.getCalendarFieldValue()` — line ~104114

This is the same function that contains [FORM-BUG-5](bug-5-fake-z-drift.md). The empty-field failure occurs because the non-legacy date+time branches (`moment(value).format(...)` for Config D, `new Date(value).toISOString()` for Config C) execute without checking whether `value` is empty or null first.

**Call chain:**

```text
VV.Form.GetFieldValue('Field5')
  → getValueObjectValue()            Reads raw stored value: "" (empty)
  → getCalendarFieldValue()          No empty guard → falls through to moment("").format(...)
  → Returns "Invalid Date"
```

---

## Appendix: Field Configuration Reference

The test form has 8 field configurations referred to by letter throughout this document:

| Config | Field   | enableTime | ignoreTimezone | useLegacy | Description                                         |
| ------ | ------- | ---------- | -------------- | --------- | --------------------------------------------------- |
| A      | Field7  | —          | —              | —         | Date-only baseline                                  |
| B      | Field10 | —          | ✅             | —         | Date-only + ignoreTZ                                |
| C      | Field6  | ✅         | —              | —         | DateTime UTC — **FORM-BUG-6 (crash/epoch)**         |
| D      | Field5  | ✅         | ✅             | —         | DateTime + ignoreTZ — **FORM-BUG-6 (Invalid Date)** |
| E      | Field12 | —          | —              | ✅        | Legacy date-only                                    |
| F      | Field11 | —          | ✅             | ✅        | Legacy date-only + ignoreTZ                         |
| G      | Field14 | ✅         | —              | ✅        | Legacy DateTime                                     |
| H      | Field13 | ✅         | ✅             | ✅        | Legacy DateTime + ignoreTZ                          |

---

## Workarounds and Fix Recommendations

See [bug-6-fix-recommendations.md](bug-6-fix-recommendations.md) for workarounds (including the recommended `GetDateObjectFromCalendar()` alternative), proposed code fix, and fix impact assessment.
