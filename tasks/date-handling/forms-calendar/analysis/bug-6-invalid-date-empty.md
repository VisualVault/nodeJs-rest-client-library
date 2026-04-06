# Bug #6: GetFieldValue Returns "Invalid Date" for Empty Fields

## Classification

| Field                  | Value                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Severity**           | Medium (Config D: truthy garbage). **High for Config C** (uncaught RangeError — crash).                                                                            |
| **Evidence**           | `[LIVE]` — Confirmed for Config D (returns `"Invalid Date"`) and Config C (throws `RangeError`). Tested in BRT, IST.                                               |
| **Component**          | FormViewer → CalendarValueService → `getCalendarFieldValue()`                                                                                                      |
| **Code Path**          | V1 (default) — V2 bypasses this entirely (returns raw value `""`)                                                                                                  |
| **Affected Configs**   | C (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`) and D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) — two different failure modes |
| **Affected TZs**       | All — timezone-independent (empty is empty everywhere)                                                                                                             |
| **Affected Scenarios** | 8 (GetFieldValue on empty/cleared fields)                                                                                                                          |
| **Related Bugs**       | Same function as Bug #5. Both are fixed by the same empty-guard addition.                                                                                          |

---

## Summary

When a Config C or D calendar field is empty (value is `""`), `getCalendarFieldValue()` does not guard against empty input before applying its transformation. This produces **two different failure modes** depending on the `ignoreTimezone` flag: Config D (`ignoreTimezone=true`) calls `moment("").format(...)` which returns the literal string `"Invalid Date"` — a truthy value that breaks developer conditionals. Config C (`ignoreTimezone=false`) calls `new Date("").toISOString()` which throws an uncaught `RangeError` — crashing any script that doesn't wrap the call in try/catch. Both failures are absent in date-only configs, legacy configs, and the V2 code path.

---

## Who Is Affected

- **Developers** writing form scripts that check whether a DateTime field has a value before processing it — the standard pattern `if (VV.Form.GetFieldValue('field'))` silently passes for empty Config D fields and crashes for empty Config C fields
- **Form event scripts** that run on form load or button click and read Config C/D fields without try/catch protection — a single empty Config C field crashes the entire script
- **All timezones** equally — the bug is not timezone-dependent
- **End users** indirectly — they see script failures or incorrect conditional behavior triggered by empty date fields

### Failure Mode Summary

| Config | `ignoreTimezone` | Empty GFV Return        | Type      | Truthy? | Crashes? |
| ------ | :--------------: | ----------------------- | --------- | :-----: | :------: |
| A      |      false       | `""`                    | String    |   No    |    No    |
| B      |       true       | `""`                    | String    |   No    |    No    |
| **C**  |      false       | **throws `RangeError`** | Exception |   N/A   | **YES**  |
| **D**  |       true       | **`"Invalid Date"`**    | String    | **YES** |    No    |
| E      |      false       | `""`                    | String    |   No    |    No    |
| F      |       true       | `""`                    | String    |   No    |    No    |
| G      |      false       | `""`                    | String    |   No    |    No    |
| H      |       true       | `""`                    | String    |   No    |    No    |

Only configs where `enableTime=true` AND `useLegacy=false` are affected. The `useLegacy` guard causes the function to `return value` early (the raw `""` string), which is correct.

---

## Root Cause

### The Defective Code

**File**: `main.js`
**Function**: `CalendarValueService.getCalendarFieldValue()` — line ~104114

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;  // V2: returns "" for empty — CORRECT

    // NO EMPTY GUARD HERE — value="" falls through to transformations below

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        if (fieldDef.ignoreTimezone) {
            // Config D path — Bug #6a:
            const format = "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]";
            return moment(value).format(format);
            // moment("") → invalid moment → .format() → "Invalid Date"
        }
        // Config C path — Bug #6b:
        return new Date(value).toISOString();
        // new Date("") → Invalid Date object → .toISOString() → throws RangeError
    }

    return value;  // Legacy or date-only: returns "" correctly
}
```

### Why This Is Wrong — Config D Path

`moment("")` creates an **invalid moment object**. When `.format()` is called on an invalid moment, it does not throw — it returns the literal string `"Invalid Date"`:

```javascript
moment('').isValid(); // → false
moment('').format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]'); // → "Invalid Date"
typeof moment('').format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]'); // → "string"
```

The string `"Invalid Date"` is:

- **Truthy**: `!!"Invalid Date"` → `true`
- **Non-empty**: `"Invalid Date".length` → 12
- **Not parseable**: `new Date("Invalid Date")` → Invalid Date object
- **Not a valid ISO string**: No date parser will accept it

### Why This Is Wrong — Config C Path

`new Date("")` creates an **Invalid Date object** (the internal time value is `NaN`). When `.toISOString()` is called on an Invalid Date, it throws:

```javascript
new Date(''); // → Invalid Date (NaN internally)
new Date('').toISOString(); // → throws RangeError: Invalid time value
```

This is **worse** than Config D's behavior because it's an uncaught exception that propagates up the call stack, crashing the script unless the developer wrapped `GetFieldValue()` in a try/catch block — which is not a standard pattern for a getter function.

### What Should Happen

Both paths should guard against empty input and return `""` (empty string) or `null` — consistent with other field types and with the V2 code path:

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;

    if (!value || value.length === 0)
        return "";  // ← Empty guard — return empty string for empty fields

    // ... rest of function
}
```

---

## Expected vs Actual Behavior

### Config D — Empty Field

| Step                                     | Expected                 | Actual                              |
| ---------------------------------------- | ------------------------ | ----------------------------------- |
| Raw stored value (`getValueObjectValue`) | `""`                     | `""` ✓                              |
| `GetFieldValue()` return                 | `""`                     | **`"Invalid Date"`** ✗              |
| `if (GetFieldValue('Field5'))`           | `false` (field is empty) | **`true`** (truthy string) ✗        |
| `typeof GetFieldValue('Field5')`         | `"string"`               | `"string"` (same type, wrong value) |

### Config C — Empty Field

| Step                                     | Expected | Actual                    |
| ---------------------------------------- | -------- | ------------------------- |
| Raw stored value (`getValueObjectValue`) | `""`     | `""` ✓                    |
| `GetFieldValue()` return                 | `""`     | **throws `RangeError`** ✗ |
| Script continues after call              | Yes      | **No — crash** ✗          |

### Control — Config A (Date-Only, Empty)

| Step                           | Expected | Actual    |
| ------------------------------ | -------- | --------- |
| Raw stored value               | `""`     | `""` ✓    |
| `GetFieldValue()` return       | `""`     | `""` ✓    |
| `if (GetFieldValue('Field7'))` | `false`  | `false` ✓ |

### Control — Config H (Legacy DateTime, Empty)

| Step                     | Expected | Actual |
| ------------------------ | -------- | ------ |
| Raw stored value         | `""`     | `""` ✓ |
| `GetFieldValue()` return | `""`     | `""` ✓ |

The `useLegacy=true` check causes early `return value` — the transformation code never runs.

### GetDateObjectFromCalendar — Safe Alternative

| Config | Empty GDOC Return | Type      |  Falsy?   |
| ------ | ----------------- | --------- | :-------: |
| D      | `undefined`       | Undefined | **Yes** ✓ |
| C      | `undefined`       | Undefined | **Yes** ✓ |
| A      | `undefined`       | Undefined | **Yes** ✓ |

`GetDateObjectFromCalendar()` bypasses `getCalendarFieldValue()` entirely and returns `undefined` for empty fields — universally falsy and safe.

---

## Steps to Reproduce

### Config D — "Invalid Date" String

1. Open a form with a Config D field (`Field5`: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`)
2. Leave the field empty (or clear it if it has a value)
3. In DevTools console:

    ```javascript
    // Check raw value — should be empty
    VV.Form.VV.FormPartition.getValueObjectValue('Field5');
    // Returns: ""

    // Check GetFieldValue — Bug #6
    VV.Form.GetFieldValue('Field5');
    // Returns: "Invalid Date"

    // The broken conditional
    if (VV.Form.GetFieldValue('Field5')) {
        console.log('Field has a value!'); // ← THIS RUNS for an empty field
    }
    ```

### Config C — RangeError Crash

4. On the same form, check Config C field (`Field6`: `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`)
5. Leave it empty, then:
    ```javascript
    VV.Form.GetFieldValue('Field6');
    // THROWS: RangeError: Invalid time value
    // Script execution stops here
    ```

---

## Test Evidence

### Category 8 — GetFieldValue on Empty Fields

| Test ID       | Config | TZ  | Expected | Actual              | Status   | Run File                         |
| ------------- | ------ | --- | -------- | ------------------- | -------- | -------------------------------- |
| 8-D-empty     | D      | BRT | `""`     | `"Invalid Date"`    | **FAIL** | `runs/tc-8-D-empty-run-1.md`     |
| 8-D-empty-IST | D      | IST | `""`     | `"Invalid Date"`    | **FAIL** | `runs/tc-8-D-empty-IST-run-2.md` |
| 8-C-empty     | C      | BRT | `""`     | throws `RangeError` | **FAIL** | `runs/tc-8-C-empty-run-2.md`     |
| 8-A-empty     | A      | BRT | `""`     | `""`                | **PASS** | `runs/tc-8-A-empty-run-2.md`     |
| 8-H-empty     | H      | BRT | `""`     | `""`                | **PASS** | `runs/tc-8-H-empty-run-1.md`     |

### Category 8B — GetDateObjectFromCalendar on Empty Fields

| Test ID    | Config | Expected    | Actual      | Status   |
| ---------- | ------ | ----------- | ----------- | -------- |
| 8B-D-empty | D      | `undefined` | `undefined` | **PASS** |
| 8B-A-empty | A      | `undefined` | `undefined` | **PASS** |

GDOC is immune — no Bug #6 equivalent.

### Overall Category 8 Counts

- **18/19 done** — **12 PASS, 6 FAIL**
- 4 of 6 failures are Bug #5 (fake Z on populated Config D)
- 2 of 6 failures are Bug #6 (empty Config C/D)

---

## Impact Analysis

### Developer Script Breakage

The most common pattern for checking field emptiness in VV form scripts is:

```javascript
const dateVal = VV.Form.GetFieldValue('dateField');
if (dateVal) {
    // Process the date
}
```

Bug #6 causes this pattern to **silently execute the processing block for empty Config D fields** (because `"Invalid Date"` is truthy) or **crash the script for empty Config C fields** (uncaught RangeError). Both outcomes are wrong.

**Downstream consequences:**

- Scripts may attempt to parse `"Invalid Date"` as a date → `new Date("Invalid Date")` → Invalid Date object → cascading errors
- Scripts with Config C fields crash entirely on empty fields, potentially leaving forms in an inconsistent state
- Error messages in production logs show `RangeError: Invalid time value` with no indication it comes from `GetFieldValue()`

### Scope and Frequency

- Bug #6 only triggers when a field is **empty** — a common state for optional date fields or newly created forms before the user fills in dates
- Only `enableTime=true` + `useLegacy=false` configs (C, D) — date-only and legacy configs are safe
- Every form load where a script reads an optional DateTime field is at risk

### Interaction with Bug #5

Bug #5 and Bug #6 share the same function (`getCalendarFieldValue`) and the same code path entry condition (`!useLegacy && enableTime`). They are:

- **Bug #5**: Populated field → fake Z added to value → progressive drift on round-trip
- **Bug #6**: Empty field → no value guard → `"Invalid Date"` or RangeError

A single fix (adding an empty guard at the top of the function) resolves Bug #6 without affecting Bug #5. However, the recommended Bug #5 fix (Option A: return raw value) also resolves Bug #6 because the raw empty value `""` is returned before any transformation.

---

## Workarounds

### Workaround #1: Explicit "Invalid Date" Guard

Add a check after every `GetFieldValue()` call on Config C/D fields:

```javascript
const val = VV.Form.GetFieldValue('Field5');
if (val && val !== 'Invalid Date') {
    // Field has a real value — safe to process
}
```

**Limitation**: Does not protect against Config C's RangeError. For Config C, you need try/catch.

### Workaround #2: Try/Catch Wrapper for Config C

```javascript
let val;
try {
    val = VV.Form.GetFieldValue('Field6');
} catch (e) {
    val = ''; // Empty field — GetFieldValue threw RangeError
}
if (val) {
    // Process date
}
```

**Limitation**: Requires every GetFieldValue call on Config C to be wrapped. Verbose and error-prone.

### Workaround #3: Use GetDateObjectFromCalendar() (Recommended)

Replace `GetFieldValue()` with `GetDateObjectFromCalendar()` for all Config C/D reads:

```javascript
const dateObj = VV.Form.GetDateObjectFromCalendar('Field5');
if (dateObj) {
    // dateObj is a valid Date object — field has a value
    const isoStr = dateObj.toISOString();
}
// dateObj is undefined — field is empty (falsy, safe)
```

**Advantages**:

- Returns `undefined` for empty fields (falsy — standard JS pattern)
- No fake Z (also avoids Bug #5)
- No crash (also avoids Config C's RangeError)
- Works identically across all configs

**Evidence**: Category 8B — 12 tests, 11 PASS, 1 FAIL (Bug #7 upstream, not GDOC). `[LIVE]`

### Workaround #4: Check Raw Value First

```javascript
const raw = VV.Form.VV.FormPartition.getValueObjectValue('Field5');
if (raw && raw.length > 0) {
    const val = VV.Form.GetFieldValue('Field5');
    // Safe — we know the field is populated
}
```

**Caveat**: Uses an internal API (`getValueObjectValue`) that may change across platform versions.

---

## Proposed Fix

### Before (Current)

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;

    // NO EMPTY GUARD — empty string falls through

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        if (fieldDef.ignoreTimezone) {
            return moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]");
            // moment("").format() → "Invalid Date"
        }
        return new Date(value).toISOString();
        // new Date("").toISOString() → throws RangeError
    }

    return value;
}
```

### After (Fixed)

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
            // Still has Bug #5 (fake Z) for populated values — fix separately
        }
        return new Date(value).toISOString();
    }

    return value;
}
```

### Key Change

**One line added**: `if (!value || value.length === 0) return "";`

This single guard:

- Returns `""` (empty string, falsy) for empty Config D fields instead of `"Invalid Date"`
- Prevents the `RangeError` crash for empty Config C fields
- Matches V2 behavior (which returns raw `""`)
- Matches date-only and legacy config behavior (which already return `""` via `return value`)
- Has zero effect on populated fields (the guard only triggers when value is empty/null/undefined)

### Relationship to Bug #5 Fix

If Bug #5 is fixed with Option A (return raw value for Config D), the Config D path becomes `return value` — which already handles empty correctly (`""` → `""`). However, the Config C path (`new Date(value).toISOString()`) still needs the explicit guard. **The empty guard should be added regardless of how Bug #5 is resolved.**

---

## Fix Impact Assessment

### What Changes If Fixed

- Empty Config D fields: `GetFieldValue()` returns `""` instead of `"Invalid Date"`
- Empty Config C fields: `GetFieldValue()` returns `""` instead of throwing `RangeError`
- Developer conditionals `if (GetFieldValue('field'))` correctly evaluate to `false` for empty fields
- Scripts no longer crash on empty Config C fields

### Backwards Compatibility Risk

**LOW** — but not zero.

| Pattern                                                                     | Impact                                                                                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `if (val === "Invalid Date")` — explicit check for Bug #6 output            | Breaks — value is now `""` instead. But this pattern was a workaround, not intentional behavior. |
| `try { GetFieldValue('Field6') } catch(e) { ... }` — try/catch for Config C | The catch block no longer triggers. Script still works, but dead code remains.                   |
| `if (GetFieldValue('field'))` — standard emptiness check                    | **Fixed** — now correctly returns falsy for empty fields.                                        |

Scripts that relied on the buggy behavior (checking for `"Invalid Date"` explicitly) will need to update their checks. But this is a workaround being removed, not intended functionality being changed.

### Regression Risk

**Very Low** — this is a single guard clause added before existing logic. It:

- Only activates when value is empty/null/undefined
- Has no effect on any populated field
- Matches the behavior of every other config and the V2 path
- Is the smallest possible change to fix both failure modes

**Testing scope**: Category 8 empty field tests for Configs C, D, plus spot-check that populated Config C/D values are unaffected.
