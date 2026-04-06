# FORM-BUG-6: GetFieldValue Crashes or Returns Truthy Garbage for Empty Date+Time Fields

## What Happens

The standard way to check whether a calendar field has a value in VV form scripts is:

```javascript
if (VV.Form.GetFieldValue('dateField')) {
    // Field has a value — process it
}
```

This pattern breaks for two specific date+time field configurations when the field is **empty**:

- **Config D** (date+time, ignore-timezone, non-legacy): `GetFieldValue()` returns the string `"Invalid Date"` instead of an empty string. Because `"Invalid Date"` is a non-empty string, it evaluates as **truthy** — the processing block executes even though the field is empty. Any attempt to parse this value as a date fails silently or produces garbage.

- **Config C** (date+time, standard timezone, non-legacy): `GetFieldValue()` **throws an uncaught `RangeError`** — crashing the entire script. The developer never gets a chance to check the value; the call itself explodes.

- **Config C with `null` stored value**: Instead of throwing, `GetFieldValue()` silently returns `"1970-01-01T00:00:00.000Z"` — the Unix epoch (January 1, 1970). This is a valid-looking ISO date string that passes all format checks, but represents a completely wrong date that was never entered by anyone.

Date-only fields, legacy fields, and the V2 code path all correctly return an empty string for empty fields. Only date+time non-legacy fields are affected.

---

## Severity: MEDIUM (Config D) / HIGH (Config C)

Config C's uncaught exception crashes scripts entirely — any form button script or event handler that reads an optional Config C field without try/catch protection will fail on empty fields. Config D's truthy `"Invalid Date"` is more insidious — scripts silently enter processing blocks they shouldn't, potentially corrupting data or producing incorrect results downstream.

---

## Who Is Affected

- **Developers** writing form scripts that check whether a date+time field has a value before processing it — the most basic conditional pattern in VV scripting is broken for these two field types
- **Form event scripts** that run on form load or button click and read optional date+time fields — a single empty Config C field crashes the entire script
- **End users** see script failures or incorrect behavior triggered by empty date fields — they may not understand why a form button stopped working when the date field is simply blank
- **All timezones equally** — this bug is not timezone-dependent; empty is empty everywhere

### The Three Failure Modes

| Config | Field   | Stored Value | GetFieldValue Returns            | Truthy? | Crashes? | Problem                               |
| :----: | ------- | ------------ | -------------------------------- | :-----: | :------: | ------------------------------------- |
| **C**  | Field6  | `""`         | **throws `RangeError`**          |   N/A   | **Yes**  | Script crashes                        |
| **C**  | Field6  | `null`       | **`"1970-01-01T00:00:00.000Z"`** | **Yes** |    No    | Returns epoch — looks valid, is wrong |
| **D**  | Field5  | `""`         | **`"Invalid Date"`**             | **Yes** |    No    | Truthy garbage string                 |
| **D**  | Field5  | `null`       | **`"Invalid Date"`**             | **Yes** |    No    | Same truthy garbage                   |
|   A    | Field7  | `""`         | `""`                             |   No    |    No    | Correct                               |
|   B    | Field10 | `""`         | `""`                             |   No    |    No    | Correct                               |
|   E    | Field12 | `""`         | `""`                             |   No    |    No    | Correct                               |
|   G    | Field14 | `""`         | `""`                             |   No    |    No    | Correct                               |
|   H    | Field13 | `""`         | `""`                             |   No    |    No    | Correct                               |

---

## Which Fields Are Affected

Calendar fields have three configuration flags:

| Flag             | What It Controls                                                           |
| ---------------- | -------------------------------------------------------------------------- |
| `enableTime`     | Whether the field stores time in addition to date (date-only vs date+time) |
| `ignoreTimezone` | Whether timezone conversion is skipped (treat value as display time)       |
| `useLegacy`      | Whether the field uses the older rendering/save code path                  |

FORM-BUG-6 requires **`enableTime=true` AND `useLegacy=false`**. Within that set, the failure mode depends on `ignoreTimezone`:

| Config | enableTime | ignoreTimezone | useLegacy | Empty Behavior                                      |
| :----: | :--------: | :------------: | :-------: | --------------------------------------------------- |
| **C**  |  **true**  |    **off**     |  **off**  | Throws RangeError (crash) or returns epoch for null |
| **D**  |  **true**  |     **on**     |  **off**  | Returns `"Invalid Date"` (truthy)                   |
|   G    |    true    |      off       |  **on**   | Returns `""` — safe (legacy guard)                  |
|   H    |    true    |       on       |  **on**   | Returns `""` — safe (legacy guard)                  |
|  A-F   |    off     |       \*       |    \*     | Returns `""` — safe (date-only passthrough)         |

The `useLegacy=true` guard causes the function to return the raw value (`""`) before reaching the transformation code. Date-only fields (`enableTime=false`) also return the raw value early. Only the non-legacy date+time path reaches the defective code.

---

## The Problem in Detail

### Why Config D Returns "Invalid Date"

The function that transforms `GetFieldValue()` output uses the moment.js library to format the value. When it receives an empty string:

```javascript
moment('').format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
// → "Invalid Date"
```

`moment("")` creates an **invalid moment object**. When `.format()` is called on an invalid moment, it doesn't throw — it returns the literal string `"Invalid Date"`. This string is:

- **Truthy**: `!!"Invalid Date"` → `true`
- **Non-empty**: `"Invalid Date".length` → 12
- **Unparseable**: `new Date("Invalid Date")` → Invalid Date object
- **Not a valid ISO string**: No date parser will accept it

### Why Config C Throws a RangeError

The Config C path uses native JavaScript instead of moment.js:

```javascript
new Date('').toISOString();
// → throws RangeError: Invalid time value
```

`new Date("")` creates an **Invalid Date object** (the internal time value is `NaN`). When `.toISOString()` is called on an Invalid Date, JavaScript throws a `RangeError`. This is an uncaught exception that propagates up the call stack, crashing the script.

### Why Config C with `null` Returns the Unix Epoch

When the stored value is `null` (rather than empty string):

```javascript
new Date(null).toISOString();
// → "1970-01-01T00:00:00.000Z"
```

Unlike `new Date("")`, `new Date(null)` is valid JavaScript — it creates a Date at Unix epoch (timestamp 0). The `.toISOString()` call succeeds and returns a perfectly formatted ISO string. This is arguably the worst failure mode because:

- It doesn't crash (no error to catch)
- It returns a truthy, parseable, valid-looking date
- The date (January 1, 1970) was never entered by anyone
- Code downstream has no way to distinguish this from a real value

### The Common Pattern and How It Breaks

```javascript
// Developer writes the standard emptiness check:
const dateVal = VV.Form.GetFieldValue('dateField');
if (dateVal) {
    // Process the date — assumes field has a value
    const parsed = new Date(dateVal);
    // ... use parsed date
}
```

| Field Configuration     | Empty Field Behavior              | Developer Impact                          |
| ----------------------- | --------------------------------- | ----------------------------------------- |
| Date-only (A, B)        | Returns `""` (falsy)              | Correct — block skipped                   |
| Legacy date+time (G, H) | Returns `""` (falsy)              | Correct — block skipped                   |
| **Config D**            | Returns `"Invalid Date"` (truthy) | **Wrong** — block entered for empty field |
| **Config C**            | Throws `RangeError`               | **Crash** — script dies before the `if`   |

---

## Steps to Reproduce

### Config D — "Invalid Date" String

1. Open a form with Field5 (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`)
2. Leave the field empty (or clear it if it has a value)
3. In DevTools console:

```javascript
// Raw stored value — should be empty
VV.Form.VV.FormPartition.getValueObjectValue('Field5');
// Returns: ""

// GetFieldValue — Bug!
VV.Form.GetFieldValue('Field5');
// Returns: "Invalid Date"

// The broken conditional
if (VV.Form.GetFieldValue('Field5')) {
    console.log('This runs for an empty field!'); // ← THIS RUNS
}
```

### Config C — RangeError Crash

4. Check Config C field (`Field6`: `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`)
5. Leave it empty, then:

```javascript
VV.Form.GetFieldValue('Field6');
// THROWS: RangeError: Invalid time value
// Script execution stops here — no value returned
```

---

## Workarounds

### Recommended: Use `GetDateObjectFromCalendar()`

Replace `GetFieldValue()` with `VV.Form.GetDateObjectFromCalendar('fieldName')` for all date+time field reads. This function returns a native JavaScript `Date` object directly from the stored value, bypassing the defective transformation entirely. For empty fields, it returns `undefined` (falsy — safe for standard conditionals).

```javascript
// BROKEN — triggers FORM-BUG-6
const val = VV.Form.GetFieldValue('Field5');
if (val) {
    /* enters block for empty field */
}

// SAFE — bypasses FORM-BUG-6
const dateObj = VV.Form.GetDateObjectFromCalendar('Field5');
if (dateObj) {
    // dateObj is a valid Date object — field really has a value
    const isoStr = dateObj.toISOString();
}
// dateObj is undefined — field is empty (falsy, safe)
```

Tested across all 8 field configurations — `GetDateObjectFromCalendar()` returns `undefined` for all empty fields, regardless of configuration. Also avoids [FORM-BUG-5](bug-5-fake-z-drift.md) (fake Z on populated fields).

### Alternative: Explicit "Invalid Date" Guard

Add a check after every `GetFieldValue()` call on Config D fields:

```javascript
const val = VV.Form.GetFieldValue('Field5');
if (val && val !== 'Invalid Date') {
    // Field has a real value
}
```

Does not protect against Config C's `RangeError`.

### Alternative: Try/Catch for Config C

```javascript
let val;
try {
    val = VV.Form.GetFieldValue('Field6');
} catch (e) {
    val = ''; // Empty field — GetFieldValue threw RangeError
}
if (val) {
    /* process */
}
```

Verbose and error-prone — requires wrapping every Config C `GetFieldValue` call.

### Alternative: Check Raw Value First

```javascript
const raw = VV.Form.VV.FormPartition.getValueObjectValue('Field5');
if (raw && raw.length > 0) {
    const val = VV.Form.GetFieldValue('Field5');
    // Safe — field is populated
}
```

Uses an internal API (`getValueObjectValue`) that may change across platform versions.

---

## Test Evidence

### All 8 Configs — Empty Field GetFieldValue

| Config | Field   | enableTime | ignoreTZ | legacy  | GFV Return            | Truthy? | Bug?             |
| :----: | ------- | :--------: | :------: | :-----: | --------------------- | :-----: | ---------------- |
|   A    | Field7  |    off     |   off    |   off   | `""`                  |   No    | No               |
|   B    | Field10 |    off     |    on    |   off   | `""`                  |   No    | No               |
| **C**  | Field6  |   **on**   | **off**  | **off** | **throws RangeError** |    —    | **Yes (crash)**  |
| **D**  | Field5  |   **on**   |  **on**  | **off** | **`"Invalid Date"`**  | **Yes** | **Yes (truthy)** |
|   E    | Field12 |    off     |   off    |   on    | `""`                  |   No    | No               |
|   F    | Field11 |    off     |    on    |   on    | `""`                  |   No    | No               |
|   G    | Field14 |     on     |   off    |   on    | `""`                  |   No    | No               |
|   H    | Field13 |     on     |    on    |   on    | `""`                  |   No    | No               |

### Direct getCalendarFieldValue() — Empty and Null Inputs

| Config | Input  | Result                                  | Issue                                                  |
| :----: | ------ | --------------------------------------- | ------------------------------------------------------ |
|   C    | `""`   | THROWS `RangeError: Invalid time value` | `new Date("").toISOString()` crashes                   |
|   D    | `""`   | `"Invalid Date"` (truthy)               | `moment("").format(...)` returns literal string        |
|   G    | `""`   | `""`                                    | Safe — legacy passthrough                              |
|   H    | `""`   | `""`                                    | Safe — legacy passthrough                              |
|   A    | `""`   | `""`                                    | Safe — date-only passthrough                           |
| **D**  | `null` | **`"Invalid Date"`**                    | Same bug with null input                               |
| **C**  | `null` | **`"1970-01-01T00:00:00.000Z"`**        | Epoch return: `new Date(null)` = epoch, does NOT crash |

### GetDateObjectFromCalendar — Safe Alternative

| Field       | Config | Empty Result | Truthy? | Safe? |
| ----------- | :----: | ------------ | :-----: | :---: |
| Field5 (D)  |   D    | `undefined`  |   No    |  Yes  |
| Field6 (C)  |   C    | `undefined`  |   No    |  Yes  |
| Field7 (A)  |   A    | `undefined`  |   No    |  Yes  |
| Field13 (H) |   H    | `undefined`  |   No    |  Yes  |

Universally safe — returns `undefined` (falsy) for all empty fields regardless of configuration.

### Playwright Regression

| Test      | Expected | Received                      | Status   |
| --------- | -------- | ----------------------------- | -------- |
| 8-A-empty | `""`     | `""`                          | PASS     |
| 8-C-empty | `""`     | `"ERROR: Invalid time value"` | **FAIL** |
| 8-D-empty | `""`     | `"Invalid Date"`              | **FAIL** |
| 8-H-empty | `""`     | `""`                          | PASS     |

### Overall Category 8 Counts

- 18 of 19 tests done — 12 PASS, 6 FAIL
- 4 of 6 failures are [FORM-BUG-5](bug-5-fake-z-drift.md) (fake Z on populated Config D fields)
- 2 of 6 failures are FORM-BUG-6 (empty Config C/D)

---

## Technical Root Cause

### The Missing Empty Guard

**File**: `main.js` (bundled FormViewer application)
**Function**: `CalendarValueService.getCalendarFieldValue()` — line ~104114

This is the same function that contains [FORM-BUG-5](bug-5-fake-z-drift.md) (fake Z on populated Config D fields). FORM-BUG-6 is the empty-field case of the same code:

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;  // V2: returns "" for empty — correct

    // NO EMPTY GUARD — empty string falls through to transformations

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        if (fieldDef.ignoreTimezone) {
            // Config D path:
            const format = "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]";
            return moment(value).format(format);
            // moment("") → invalid moment → .format() → "Invalid Date"
        }
        // Config C path:
        return new Date(value).toISOString();
        // new Date("") → Invalid Date → .toISOString() → throws RangeError
        // new Date(null) → epoch → .toISOString() → "1970-01-01T00:00:00.000Z"
    }

    return value;  // Legacy or date-only: returns "" correctly
}
```

The V2 path (`useUpdatedCalendarValueLogic = true`) returns the raw value immediately, which is `""` for empty fields — correct. Date-only and legacy paths also reach `return value` before the transformation code. Only the non-legacy date+time path reaches the defective `moment()` / `new Date()` calls without checking for empty input first.

### Relationship to FORM-BUG-5

FORM-BUG-5 and FORM-BUG-6 share the same function, the same code path, and the same entry condition (`!useLegacy && enableTime`). They represent different cases:

- **FORM-BUG-5**: Populated field → fake Z added → progressive drift on round-trip
- **FORM-BUG-6**: Empty field → no value guard → "Invalid Date" or RangeError or epoch

The recommended FORM-BUG-5 fix (Option A: return raw value for Config D) also resolves FORM-BUG-6 for Config D because `return value` for empty input returns `""`. However, the Config C path (`new Date(value).toISOString()`) still needs the explicit empty guard regardless of how FORM-BUG-5 is resolved.

---

## Proposed Fix

### One-Line Empty Guard

Add a single line before the transformation logic:

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;

    // FIX: Guard against empty/null/undefined values
    if (!value || value.length === 0)
        return "";

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        if (fieldDef.ignoreTimezone) {
            return moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]");
            // Still has FORM-BUG-5 (fake Z) for populated values — fix separately
        }
        return new Date(value).toISOString();
    }

    return value;
}
```

This single guard:

- Returns `""` (falsy) for empty Config D fields instead of `"Invalid Date"`
- Prevents the `RangeError` crash for empty Config C fields
- Prevents the epoch return for Config C with null
- Matches V2 behavior, date-only behavior, and legacy behavior (all return `""`)
- Has zero effect on populated fields

---

## Fix Impact Assessment

### What Changes If Fixed

- Empty Config D fields: `GetFieldValue()` returns `""` instead of `"Invalid Date"`
- Empty Config C fields: `GetFieldValue()` returns `""` instead of throwing `RangeError`
- Config C with null: `GetFieldValue()` returns `""` instead of epoch date
- Developer conditionals `if (GetFieldValue('field'))` correctly evaluate to `false` for empty fields
- Scripts no longer crash on empty Config C fields

### Backwards Compatibility Risk: LOW

| Script Pattern                                                    | Impact                                                                        |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `if (val === "Invalid Date")` — explicit Bug workaround           | Breaks — value is now `""`. But this was a workaround, not intended behavior. |
| `try { GetFieldValue() } catch(e) {...}` — try/catch for Config C | Catch block no longer triggers. Script still works, but dead code remains.    |
| `if (GetFieldValue('field'))` — standard emptiness check          | **Fixed** — now correctly returns falsy for empty fields.                     |

Scripts that relied on the buggy behavior (checking for `"Invalid Date"` explicitly) will need to update. But this is removing a workaround, not changing intended functionality.

### Regression Risk: VERY LOW

This is a single guard clause added before existing logic. It only activates when value is empty/null/undefined and has no effect on populated fields. It matches the behavior of every other configuration and the V2 code path.

**Testing scope**: Empty field tests for Configs C and D, plus spot-check that populated Config C/D values are unaffected.

### Artifacts Created During Investigation

- `testing/scripts/audit-bug6-empty-fields.js` — comprehensive audit (4 tests across all configs)
