# Bug #5: GetFieldValue Adds Fake [Z] Causing Progressive Drift

## Classification

| Field                  | Value                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| **Severity**           | **HIGH** — progressive data corruption on every round-trip                                |
| **Evidence**           | `[LIVE]` — Confirmed in BRT (UTC-3), IST (UTC+5:30), UTC+0                                |
| **Component**          | FormViewer → CalendarValueService → `getCalendarFieldValue()`                             |
| **Code Path**          | V1 (default) — V2 bypasses this entirely (returns raw value)                              |
| **Affected Configs**   | D only (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`)                      |
| **Affected TZs**       | All except UTC+0 (which is coincidentally immune — drift is 0h)                           |
| **Affected Scenarios** | 5 (Preset Date), 6 (Current Date), 7 (SetFieldValue), 8 (GetFieldValue), 9 (Round-Trip)   |
| **Related Bugs**       | Bug #6 (same function, empty field case). Freshdesk #124697 validates cross-layer impact. |

---

## Summary

`VV.Form.GetFieldValue()` on Config D fields (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) returns values with a fake `"Z"` suffix that does not represent UTC. The `getCalendarFieldValue()` function uses moment's `format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")` where `[Z]` is moment's literal-character escape syntax — it always outputs the character `Z` regardless of the actual timezone. The result is a local-time value masquerading as UTC. When this value is passed back to `SetFieldValue()`, the fake `Z` causes the platform to reinterpret local time as UTC, shifting the stored date by the user's timezone offset. Each round-trip compounds the drift: **-3h per trip in BRT, +5:30h per trip in IST, crossing year boundaries in as few as 1 trip**.

---

## Who Is Affected

- **Developers** writing form scripts that read and write Config D fields using `GetFieldValue()` + `SetFieldValue()` — every round-trip corrupts the data
- **Automated workflows** that copy, validate, or transform Config D date values via the VV.Form API
- **All timezones** except UTC+0, which has 0h drift (the fake Z happens to be correct when local = UTC)
- **End users** do not trigger this directly — it requires programmatic `GetFieldValue()` calls. But they see the corrupted dates after scripts run.

### Drift Calculation

| Timezone              | UTC Offset | Drift per Round-Trip | Trips to Full Day Shift | Trips to Year Boundary (Jan 1)      |
| --------------------- | ---------- | -------------------- | ----------------------- | ----------------------------------- |
| BRT (São Paulo)       | UTC-3      | -3 hours             | 8 trips                 | **1 trip** (00:00 → 21:00 prev day) |
| EST (New York)        | UTC-5      | -5 hours             | ~4.8 trips              | **1 trip**                          |
| PST/PDT (LA)          | UTC-7/-8   | -7 or -8 hours       | ~3.4 trips              | **1 trip**                          |
| IST (Mumbai)          | UTC+5:30   | +5:30 hours          | ~4.4 trips              | ~4.4 trips (forward drift)          |
| JST (Tokyo)           | UTC+9      | +9 hours             | ~2.7 trips              | ~2.7 trips                          |
| UTC+0 (London winter) | UTC+0      | **0 hours**          | ∞ (never drifts)        | N/A                                 |

---

## Root Cause

### The Defective Code

**File**: `main.js`
**Function**: `CalendarValueService.getCalendarFieldValue()` — line ~104114

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;  // V2: returns raw value unchanged — NO BUG

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        if (fieldDef.ignoreTimezone) {
            // Config D path — THE BUG:
            const format = "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]";
            return moment(value).format(format);  // ← Adds literal "Z" to LOCAL time
        }
        // Config C path — different behavior:
        return new Date(value).toISOString();  // ← Proper UTC conversion
    }

    return value;  // Legacy or date-only: raw value unchanged
}
```

### The Moment.js Literal Escape Trap

In moment.js format strings, square brackets `[...]` escape literal characters. They are **not** timezone indicators:

| Format Token        | Meaning                    | Example Output                            |
| ------------------- | -------------------------- | ----------------------------------------- |
| `Z` (no brackets)   | Timezone offset            | `+05:30`, `-03:00`, `+00:00`              |
| `ZZ` (no brackets)  | Timezone offset (no colon) | `+0530`, `-0300`                          |
| `[Z]` (in brackets) | **Literal character "Z"**  | Always outputs `Z` regardless of timezone |

So `moment("2026-03-15T00:00:00").format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")` produces:

- In BRT: `"2026-03-15T00:00:00.000Z"` — **looks like UTC midnight but is actually BRT midnight**
- In IST: `"2026-03-15T00:00:00.000Z"` — **looks like UTC midnight but is actually IST midnight**
- In UTC: `"2026-03-15T00:00:00.000Z"` — **coincidentally correct**

### Why This Causes Progressive Drift

The fake Z creates a **feedback loop** when the value is round-tripped through `SetFieldValue(GetFieldValue())`:

```
INITIAL STATE:  Stored value = "2026-03-15T00:00:00" (local BRT midnight, no Z)

STEP 1 — GetFieldValue():
  getCalendarFieldValue() adds fake [Z]:
  → Returns "2026-03-15T00:00:00.000Z"  (FAKE — this is BRT midnight, NOT UTC)

STEP 2 — SetFieldValue("2026-03-15T00:00:00.000Z"):
  normalizeCalValue() receives value with Z
  → moment("2026-03-15T00:00:00.000Z").toDate() = March 15 00:00 UTC = March 14 21:00 BRT
  → calChange() → toISOString() = "2026-03-14T21:00:00.000Z"
  → getSaveValue() strips Z = "2026-03-14T21:00:00"

NEW STATE:  Stored value = "2026-03-14T21:00:00" (shifted -3h from original)
```

Each trip repeats: local value → fake Z → reinterpreted as UTC → shifted by offset → stored.

### What Should Happen

`getCalendarFieldValue()` should either:

1. Return the raw value unchanged (like V2 does), or
2. If transformation is needed, use `new Date(value).toISOString()` for proper UTC conversion (like the Config C branch does), or
3. Return the value without any Z suffix (acknowledging it's local time)

The current behavior — adding a fake Z that claims the value is UTC when it isn't — is the worst possible option because it _looks_ correct but silently corrupts data.

---

## Expected vs Actual Behavior

### GetFieldValue Return (Category 8)

| Config | TZ   | Stored Value (raw)      | Expected GFV Return                     | Actual GFV Return            | Correct?                                                   |
| ------ | ---- | ----------------------- | --------------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| D      | BRT  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` (raw)           | `"2026-03-15T00:00:00.000Z"` | **Wrong** — fake Z                                         |
| D      | IST  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` (raw)           | `"2026-03-15T00:00:00.000Z"` | **Wrong** — fake Z                                         |
| D      | UTC0 | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` (raw)           | `"2026-03-15T00:00:00.000Z"` | **Wrong** structurally, but coincidentally equals true UTC |
| C      | BRT  | `"2026-03-14T21:00:00"` | `"2026-03-15T00:00:00.000Z"` (true UTC) | `"2026-03-15T00:00:00.000Z"` | ✓ Correct — Config C uses `new Date().toISOString()`       |

**Key contrast**: Config C and Config D both add Z to the return value, but Config C does it correctly (via `new Date(value).toISOString()` which converts local→UTC) while Config D does it incorrectly (via `moment().format("[Z]")` which adds a literal character).

### Round-Trip Drift (Category 9)

| TZ       | Start Value | After 1 Trip        | After 2 Trips      | After 3 Trips        | Drift/Trip |
| -------- | ----------- | ------------------- | ------------------ | -------------------- | ---------- |
| **BRT**  | `T00:00:00` | `T21:00:00` (-3h)   | `T18:00:00` (-6h)  | `T15:00:00` (-9h)    | **-3h**    |
| **IST**  | `T00:00:00` | `T05:30:00` (+5:30) | `T11:00:00` (+11h) | `T16:30:00` (+16:30) | **+5:30h** |
| **UTC0** | `T00:00:00` | `T00:00:00` (0h)    | `T00:00:00` (0h)   | `T00:00:00` (0h)     | **0h**     |

### Year Boundary Edge Case

| TZ      | Input                   | After 1 Trip            | Cross-Year?                             |
| ------- | ----------------------- | ----------------------- | --------------------------------------- |
| **BRT** | `"2026-01-01T00:00:00"` | `"2025-12-31T21:00:00"` | **YES — crosses into 2025**             |
| **IST** | `"2025-12-31T00:00:00"` | `"2025-12-31T05:30:00"` | No — stays in 2025, time shifts forward |

A single `SetFieldValue(GetFieldValue())` call on January 1st midnight in BRT moves the date into the previous year.

### Preset / Current Date (Categories 5, 6)

| Scenario             | TZ  | Stored Value (correct)              | GFV Returns (Bug #5)                  | Shift      |
| -------------------- | --- | ----------------------------------- | ------------------------------------- | ---------- |
| Preset (Cat 5)       | BRT | `"2026-03-01T08:28:54"` (BRT local) | `"2026-03-01T08:28:54.627Z"` (fake Z) | -3h latent |
| Current Date (Cat 6) | BRT | `"2026-04-03T17:10:00"` (BRT local) | `"2026-04-03T17:10:00.467Z"` (fake Z) | -3h latent |

The drift is **latent** — the display is correct, but the GFV return value is poisoned. Any script that reads and writes back will trigger the shift.

---

## Steps to Reproduce

### Minimal Reproduction — Observe Fake Z

1. Open a form with a Config D field (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`)
2. Set a value:
    ```javascript
    VV.Form.SetFieldValue('Field5', '2026-03-15T00:00:00');
    ```
3. Read it back:
    ```javascript
    VV.Form.GetFieldValue('Field5');
    // Returns: "2026-03-15T00:00:00.000Z" ← fake Z added
    ```
4. Compare with the raw stored value:
    ```javascript
    VV.Form.VV.FormPartition.getValueObjectValue('Field5');
    // Returns: "2026-03-15T00:00:00" ← no Z (correct raw value)
    ```

### Demonstrate Progressive Drift

5. Round-trip the value:

    ```javascript
    // Trip 1
    VV.Form.SetFieldValue('Field5', VV.Form.GetFieldValue('Field5'));
    VV.Form.VV.FormPartition.getValueObjectValue('Field5');
    // BRT: "2026-03-14T21:00:00" (shifted -3h)

    // Trip 2
    VV.Form.SetFieldValue('Field5', VV.Form.GetFieldValue('Field5'));
    VV.Form.VV.FormPartition.getValueObjectValue('Field5');
    // BRT: "2026-03-14T18:00:00" (shifted -6h total)
    ```

### Demonstrate Year Boundary

6. Set to January 1:
    ```javascript
    VV.Form.SetFieldValue('Field5', '2026-01-01T00:00:00');
    VV.Form.SetFieldValue('Field5', VV.Form.GetFieldValue('Field5'));
    VV.Form.VV.FormPartition.getValueObjectValue('Field5');
    // BRT: "2025-12-31T21:00:00" ← crossed into previous year in 1 trip
    ```

---

## Test Evidence

### Category 8 — GetFieldValue Return (Config D)

- **18/19 done** — **12 PASS, 6 FAIL**
- All 6 failures are Bug #5 on Config D across BRT, IST, and UTC0
- UTC0 is structurally wrong (fake Z) but the value coincidentally matches true UTC — this test is marked FAIL because the mechanism is incorrect even though the output matches
- Run files: `runs/tc-8-D-BRT-run-*.md`, `runs/tc-8-D-IST-run-*.md`, `runs/tc-8-D-UTC0-run-*.md`

### Category 9 — Round-Trip Drift

- **20/20 complete** — **9 PASS, 11 FAIL**
- Config D drift confirmed proportional to TZ offset: BRT -3h, IST +5:30h, UTC0 0h (pass)
- PST/PDT drift confirmed: -7h per trip (corrected from -8h after DST check — March 15 is PDT)
- JST drift confirmed: +9h per trip
- Run files: `runs/tc-9-D-BRT-1-run-*.md`, `runs/tc-9-D-IST-1-run-*.md`

### Category 5 — Preset Date (Config D)

- Bug #5 confirmed: preset value stored correctly but GFV adds fake Z
- `runs/tc-5-D-BRT-run-1.md`

### Category 6 — Current Date (Config D)

- Bug #5 confirmed: current date stored correctly but GFV adds fake Z
- Only 2 of 15 Category 6 tests fail — both are Config D (BRT and IST)
- `runs/tc-6-D-BRT-run-1.md`

### Category 12 — Edge Cases (Year Boundary)

- BRT: `"2026-01-01T00:00:00"` → 1 trip → `"2025-12-31T21:00:00"` — year boundary crossed
- `runs/tc-12-year-boundary-run-1.md`

### Freshdesk #124697 — Cross-Layer Validation

The Freshdesk ticket (#124697 / WADNR-10407) reports time mutation when opening forms created via `postForms` API. The root cause chain is: `postForms` stores ISO+Z → Forms V1 loads → `parseDateString()` strips Z → reinterprets as local → display shifts by TZ offset. Bug #5 is part of this chain — GFV returns the shifted local time with fake Z, making the problem worse if scripts then write the value back.

---

## Impact Analysis

### Progressive Data Corruption

This is the most dangerous aspect of Bug #5. Unlike bugs that produce a static wrong value, Bug #5 creates a **feedback loop** — each read-write cycle adds another TZ-offset shift. The corruption is:

- **Cumulative**: 8 trips = 24h drift in BRT
- **Directional**: UTC- drifts backward (earlier dates), UTC+ drifts forward (later dates)
- **Silent**: No error, no warning, no console log. The returned value looks perfectly formatted.
- **Invisible at UTC+0**: A developer testing in UTC sees no drift and ships the script. Users in other timezones get corrupted data.

### Year Boundary Crossing

In BRT (UTC-3), a single `SetFieldValue(GetFieldValue())` call on `"2026-01-01T00:00:00"` produces `"2025-12-31T21:00:00"` — crossing into the previous year. For financial, compliance, or regulatory date fields, this is a critical data integrity failure.

### Scope Limitation

Bug #5 is narrowly scoped:

- **Only Config D** (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`)
- **Only `GetFieldValue()`** — the raw stored value is correct, and `GetDateObjectFromCalendar()` bypasses this function entirely
- **Only V1** — V2 returns raw value, eliminating the bug

This narrow scope means the bug has high severity _where it applies_ but limited blast radius.

### Interaction with Other Bugs

| Bug    | Interaction                                                                                                                                                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bug #4 | Bug #4 strips Z on save. Bug #5 adds fake Z on read. Together they create an asymmetric round-trip: save strips real Z → stored as local. Read adds fake Z → returned as "UTC". Write interprets fake Z as real → shifts by offset. |
| Bug #6 | Same function, same code path. Bug #6 is the empty-field case of `getCalendarFieldValue()`. Both are fixed by the same code change.                                                                                                 |
| Bug #7 | For date-only round-trips in UTC+, Bug #7 (-1 day/trip) compounds independently. A Config D DateTime field only has Bug #5; a Config A date-only field only has Bug #7. They don't overlap on the same field.                       |

---

## Workarounds

### Workaround #1: Use `useLegacy=true`

Set the field definition to `useLegacy=true`. Legacy fields take the `return value` branch in `getCalendarFieldValue()`, bypassing the fake Z format entirely. GFV returns the raw stored value.

**Tradeoff**: `useLegacy=true` introduces Bug #2 (popup vs typed format inconsistency) and changes the popup save behavior (stores raw `toISOString()` instead of `getSaveValue()` output). See [bug-2-inconsistent-handlers.md](bug-2-inconsistent-handlers.md).

### Workaround #2: Use `GetDateObjectFromCalendar()`

Replace `GetFieldValue()` calls with `VV.Form.GetDateObjectFromCalendar('fieldName')`. This function returns a native JavaScript `Date` object, bypassing `getCalendarFieldValue()` entirely. For empty fields it returns `undefined` (falsy, safe for conditionals — also avoids Bug #6).

```javascript
// UNSAFE — triggers Bug #5
const val = VV.Form.GetFieldValue('Field5');
VV.Form.SetFieldValue('Field5', val); // Progressive drift!

// SAFE — bypasses Bug #5
const dateObj = VV.Form.GetDateObjectFromCalendar('Field5');
if (dateObj) {
    VV.Form.SetFieldValue('Field5', dateObj.toISOString());
}
```

**Evidence**: Category 8B (GetDateObjectFromCalendar) — 12 tests, 11 PASS, 1 FAIL (failure is Bug #7 upstream, not GDOC fault). `[LIVE]`

### Workaround #3: Never Round-Trip Config D

If you must use `GetFieldValue()`, never pass the result back to `SetFieldValue()`. Use GFV for read-only purposes and source write values from a trusted origin (user input, API, or hardcoded string).

### Workaround #4: Read Raw Value

Bypass `GetFieldValue()` entirely and read the raw partition value:

```javascript
const raw = VV.Form.VV.FormPartition.getValueObjectValue('Field5');
// Returns: "2026-03-15T00:00:00" — no fake Z, no drift
```

**Caveat**: This is an internal API, not the documented public API. It may change between platform versions.

---

## Proposed Fix

### Before (Current)

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        if (fieldDef.ignoreTimezone) {
            // BUG: [Z] is a literal character, not a timezone indicator
            const format = "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]";
            return moment(value).format(format);
        }
        return new Date(value).toISOString();
    }

    return value;
}
```

### After (Fixed) — Option A: Return Raw Value

The simplest fix — align V1 behavior with V2 for Config D:

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;

    if (!value || value.length === 0)
        return "";  // Also fixes Bug #6

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        if (fieldDef.ignoreTimezone) {
            return value;  // ← Return raw value, no transformation
        }
        return new Date(value).toISOString();
    }

    return value;
}
```

### After (Fixed) — Option B: Proper UTC Conversion

If the intent was to return a UTC-normalized value for Config D:

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;

    if (!value || value.length === 0)
        return "";  // Also fixes Bug #6

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        // Both Config C and D: proper UTC conversion
        return new Date(value).toISOString();
    }

    return value;
}
```

**Note**: Option B changes Config D's return format (from local-time-with-fake-Z to actual-UTC-with-real-Z). This is semantically different — `ignoreTimezone=true` was intended to mean "treat the value as display time, don't convert to UTC." Option A respects this intent. Option B normalizes it.

### Recommendation: Option A

Option A is the safer fix because:

1. It matches V2 behavior (future direction)
2. It respects `ignoreTimezone=true` semantics (no UTC conversion)
3. It has zero risk of introducing new timezone shifts
4. It also fixes Bug #6 (empty guard)

---

## Fix Impact Assessment

### What Changes If Fixed

- `GetFieldValue()` on Config D returns the raw stored value without fake Z
- Return format changes from `"2026-03-15T00:00:00.000Z"` to `"2026-03-15T00:00:00"` (no Z, no milliseconds)
- Round-trip `SetFieldValue(GetFieldValue())` becomes idempotent (no drift)
- Year boundary edge case eliminated

### Backwards Compatibility Risk

**MEDIUM** — Existing scripts that consume `GetFieldValue()` output for Config D may depend on the current format:

| Script Pattern                                       | Risk                                                                                                                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `if (value.endsWith('Z'))` — check for UTC indicator | Breaks — value no longer ends with Z                                                                                                                                        |
| `new Date(value)` — parse as ISO                     | Works — `new Date("2026-03-15T00:00:00")` parses as local, which is correct for Config D                                                                                    |
| `value.substring(0, 10)` — extract date portion      | Works — date portion unchanged                                                                                                                                              |
| `moment(value).utc()` — convert to UTC               | **Behavior changes** — without Z, moment parses as local instead of UTC. If the script was "working around" the fake Z by treating the value as UTC, the workaround breaks. |

**Migration path**: Announce the format change. Scripts that explicitly handled the fake Z (e.g., stripping it before processing) will work correctly without changes. Scripts that relied on the Z being "real" were already getting wrong results — the fix makes them _correctly_ wrong instead of silently wrong.

### Regression Risk

- **Low for Option A**: Removing a transformation is less risky than changing one. The function returns the same value that `getValueObjectValue()` returns, which is the canonical stored value.
- **Must verify**: Scripts in production that call `GetFieldValue('Field5')` and process the result. These should be audited for Z-dependent parsing.
- **Testing scope**: Category 8 (GFV) and Category 9 (Round-Trip) tests for Config D across all timezones. Category 5 and 6 (Preset/Current Date) for Config D.
