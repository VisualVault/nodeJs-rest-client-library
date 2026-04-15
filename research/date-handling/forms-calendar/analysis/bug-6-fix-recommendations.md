# FORM-BUG-6: Workarounds and Fix Recommendations

Companion document to [bug-6-invalid-date-empty.md](bug-6-invalid-date-empty.md). Read the bug report first for full context on the defect.

---

## Workarounds

### Recommended: Use `GetDateObjectFromCalendar()`

Replace `GetFieldValue()` with `VV.Form.GetDateObjectFromCalendar('fieldName')` for all date+time field reads. This function returns a native JavaScript `Date` object directly from the stored value, bypassing the defective transformation entirely. For empty fields, it returns `undefined` (falsy — safe for standard conditionals).

```javascript
// BROKEN — triggers FORM-BUG-6
const val = VV.Form.GetFieldValue('Field5');
if (val) {
    /* enters block for empty field — "Invalid Date" is truthy */
}

// SAFE — bypasses FORM-BUG-6
const dateObj = VV.Form.GetDateObjectFromCalendar('Field5');
if (dateObj) {
    // dateObj is a valid Date object — field really has a value
    const isoStr = dateObj.toISOString();
}
// dateObj is undefined — field is empty (falsy, safe)
```

Tested across all 8 field configurations — `GetDateObjectFromCalendar()` returns `undefined` for all empty fields, regardless of configuration. Also avoids [FORM-BUG-5](bug-5-fake-z-drift.md) (literal Z on populated fields).

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

## Proposed Fix

### One-Line Empty Guard

Add a single line before the transformation logic in `getCalendarFieldValue()`:

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
            // Still has FORM-BUG-5 (literal Z) for populated values — fix separately
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
- Developer conditionals correctly evaluate to `false` for empty fields
- Scripts no longer crash on empty Config C fields

### Backwards Compatibility Risk: LOW

| Script Pattern                                                    | Impact                                                                        |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `if (val === "Invalid Date")` — explicit bug workaround           | Breaks — value is now `""`. But this was a workaround, not intended behavior. |
| `try { GetFieldValue() } catch(e) {...}` — try/catch for Config C | Catch block no longer triggers. Script still works, but dead code remains.    |
| `if (GetFieldValue('field'))` — standard emptiness check          | **Fixed** — now correctly returns falsy for empty fields.                     |

### Regression Risk: VERY LOW

This is a single guard clause added before existing logic. It only activates when value is empty/null/undefined and has no effect on populated fields. It matches the behavior of every other configuration and the V2 code path.

**Testing scope**: Empty field tests for Configs C and D, plus spot-check that populated Config C/D values are unaffected.
