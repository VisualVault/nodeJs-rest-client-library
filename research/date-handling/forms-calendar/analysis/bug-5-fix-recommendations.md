# FORM-BUG-5: Workarounds and Fix Recommendations

Companion document to [bug-5-fake-z-drift.md](bug-5-fake-z-drift.md). Read the bug report first for full context on the defect.

---

## Workarounds

### Recommended: Use `GetDateObjectFromCalendar()` Instead of `GetFieldValue()`

`VV.Form.GetDateObjectFromCalendar('fieldName')` returns a native JavaScript `Date` object directly from the stored value, bypassing the function that adds the literal Z. For empty fields it returns `undefined` (falsy — safe for conditionals).

```javascript
// UNSAFE — triggers FORM-BUG-5
const val = VV.Form.GetFieldValue('Field5');
VV.Form.SetFieldValue('Field5', val); // Progressive drift!

// SAFE — bypasses FORM-BUG-5
const dateObj = VV.Form.GetDateObjectFromCalendar('Field5');
if (dateObj) {
    VV.Form.SetFieldValue('Field5', dateObj.toISOString());
}
```

Tested in 12 scenarios across all field configurations — `GetDateObjectFromCalendar()` returns correct values in 11 of 12 cases (the one failure is caused by a different bug upstream, not by this function).

### Alternative: Enable Legacy Mode on the Field

Setting `useLegacy=true` on the field definition causes `GetFieldValue()` to return the raw stored value without any transformation, bypassing the literal Z entirely.

**Tradeoff**: Legacy mode introduces a different issue where the calendar popup and typed input store dates in different formats ([FORM-BUG-2](bug-2-inconsistent-handlers.md)).

### Alternative: Avoid Read-Write Cycles

If you must use `GetFieldValue()`, never pass the result directly back to `SetFieldValue()`. Use `GetFieldValue()` for read-only purposes (display, validation) and source write values from a trusted origin (user input, API response, or hardcoded string).

---

## Proposed Fix

### Recommended: Return Raw Value (Option A)

Align the V1 behavior with V2 — return the stored value as-is, without transformation:

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;

    if (!value || value.length === 0)
        return "";  // Also fixes FORM-BUG-6 (empty field returns invalid values)

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        if (fieldDef.ignoreTimezone) {
            return value;  // Return raw value — no literal Z
        }
        return new Date(value).toISOString();
    }

    return value;
}
```

This is the safer option because:

1. It matches V2 behavior (the intended future direction of the codebase)
2. It respects the `ignoreTimezone` semantic ("treat value as display time, don't convert to UTC")
3. It has zero risk of introducing new timezone shifts
4. It also fixes FORM-BUG-6 (the empty-field case in the same function)

### Alternative: Proper UTC Conversion (Option B)

If the intent was to always return UTC-normalized values from `GetFieldValue()`:

```javascript
if (fieldDef.ignoreTimezone) {
    return new Date(value).toISOString(); // Real UTC conversion
}
```

This changes the semantic meaning of the returned value — the `ignoreTimezone` flag was designed to mean "treat as display time." Option B would override that intent. Not recommended.

---

## Fix Impact Assessment

### What Changes

- `GetFieldValue()` on the affected field type returns the raw stored value without the literal Z
- Return format changes from `"2026-03-15T00:00:00.000Z"` to `"2026-03-15T00:00:00"`
- Read-write cycles become stable (no more progressive drift)
- Year boundary edge case eliminated

### Backwards Compatibility Risk: MEDIUM

Existing scripts that consume `GetFieldValue()` output may depend on the current format:

| Script Pattern                             | Impact                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `if (value.endsWith('Z'))` — check for UTC | Breaks — value no longer ends with Z                                                   |
| `new Date(value)` — parse as ISO           | Works — `new Date("2026-03-15T00:00:00")` parses as local, correct for this field type |
| `value.substring(0, 10)` — extract date    | Works — date portion unchanged                                                         |
| `moment(value).utc()` — convert to UTC     | Behavior changes — without Z, moment parses as local instead of UTC                    |

Scripts that relied on the Z being "real" were already getting wrong results — the fix makes the output honest about what it represents. Scripts that worked around the literal Z (e.g., stripping it before processing) will work correctly without changes.

### Regression Testing Scope

- All automated tests for the affected field configuration across all tested timezones
- Verify that other field configurations are completely unaffected
- Audit scripts that call `GetFieldValue()` on affected fields for Z-dependent parsing
- **FillinAndRelate chains**: test D→D and D→C cross-form transfers — after fix, `GetFieldValue` should return local time without `.000Z`, eliminating the chain corruption where FORM-BUG-5 feeds into FORM-BUG-1 on the receiving form (Category 4 test suite provides 9 chain baseline tests + 3 save/reload persistence tests, 2026-04-08)
