# FORM-BUG-1: Workarounds and Fix Recommendations

Companion document to [bug-1-timezone-stripping.md](bug-1-timezone-stripping.md). Read the bug report first for full context on the defect.

---

## Workarounds

### V1 (DateTime + ignoreTZ=true)

- **API-created records**: Use the `forminstance/` endpoint instead of `postForms` — `forminstance/` does not append Z to response values, avoiding the trigger entirely
- **Preset defaults**: If possible, configure the field with `ignoreTimezone=false` instead — V1's `ignoreTZ=false` path preserves the Z and parses correctly
- **Saved user data**: No workaround needed — V1's save path already strips Z, so no Z is present on reload

### V2 (all configurations)

- V2 activation is not widely understood; on the demo environment, only manual console activation was confirmed
- If V2 is active, the same `forminstance/` workaround applies for API-created records

### General

- **CurrentDate default** (`new Date()` directly) bypasses all string parsing — safe across all timezones
- **Server-side date computation** via REST API bypasses all client-side parsing

---

## Proposed Fix

### V2: `parseDateString()`

**Before:**

```javascript
parseDateString(input, enableTime, ignoreTimezone) {
    let result;
    let stripped = input.replace("Z", "");  // Unconditionally removes Z

    if (ignoreTimezone) {
        result = moment(stripped);
    } else {
        result = moment(stripped).tz("UTC", true).local();
    }

    if (!enableTime) {
        result = result.startOf("day");
    }

    return result.toISOString();
}
```

**After:**

```javascript
parseDateString(input, enableTime, ignoreTimezone) {
    if (enableTime) {
        // DateTime: preserve the value as-is, including timezone
        return new Date(input).toISOString();
    } else {
        // Date-only: extract the date portion and anchor to UTC midnight
        let dateStr = input.includes("T") ? input.substring(0, input.indexOf("T")) : input;
        dateStr = dateStr.replace("Z", "");
        return new Date(dateStr + "T00:00:00.000Z").toISOString();
    }
}
```

### V1: Inline Code at Lines ~102889/102893

**Before:**

```javascript
e = this.data.value.replace('Z', '');
// ... new Date(e)
```

**After:**

```javascript
e = this.data.value; // Preserve Z — let new Date() handle UTC correctly
// ... new Date(e)
```

This aligns V1's `ignoreTZ=true` path with the `ignoreTZ=false` path, which already correctly preserves the Z.

### Key Changes

1. **V2 DateTime values**: Parse with `new Date()` which respects the Z suffix natively — no stripping needed
2. **V2 Date-only values**: Extract the date portion and explicitly anchor to UTC midnight, preserving the calendar date regardless of timezone
3. **V2**: Removed the `ignoreTimezone` branching inside `parseDateString` — the flag should affect display formatting, not how the value is parsed from storage
4. **V1**: Remove the `replace("Z","")` call at lines ~102889/102893 — let `new Date()` parse the value with its original timezone marker

---

## Fix Impact Assessment

### What Changes If Fixed

- V2 form loads correctly preserve UTC dates regardless of user timezone (all field configurations)
- V1 DateTime + ignoreTZ=true form loads correctly preserve UTC dates (Configs D, H)
- Preset dates display the correct day for all users in both code paths
- API-created records (`postForms`) load without timezone shift

### Backwards Compatibility Risk: MEDIUM

**V1 saved data**: Stored without Z (save path strips it). After the fix, `new Date("2026-03-15T00:00:00")` (no Z) still parses as local time — identical to current behavior. **No regression for saved user data.**

**V2 saved data**: Same — no Z in storage means no behavior change on reload.

**API-created records**: These arrive with Z. After the fix, the Z is preserved and parsed correctly — **this is the intended behavior change** (shift eliminated).

**Migration consideration**: If V2 is enabled globally, the save path ([FORM-BUG-4](bug-4-legacy-save-format.md) fix) and the load path (this fix) should be deployed together to maintain round-trip consistency. Fixing the load path alone is safe for existing data but could create a mismatch if V2 starts saving in a different format.

### Regression Risk

- V2: `parseDateString` is called on every V2 form load for every calendar field — fix must be tested across all 8 field configurations and multiple timezones
- V1: Fix is scoped to two lines (~102889/102893) affecting only DateTime + ignoreTZ=true — narrow blast radius
- Both fixes should be deployed together for consistency
- **URL parameter input** (`enableQListener=true` fields): fix applies to same V1 code path and should be tested via URL param scenarios (Category 4 test suite provides baseline). FillinAndRelate chains are the highest-impact regression case — D→D transfers currently compound FORM-BUG-5+BUG-1; after fix, the Z should be preserved and parsed correctly, eliminating the chain corruption
