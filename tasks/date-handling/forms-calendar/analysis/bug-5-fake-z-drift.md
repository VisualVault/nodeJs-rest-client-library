# FORM-BUG-5: Developer API Returns Corrupted Date Values, Causing Progressive Drift

## What Happens

When a developer script reads a date/time value from a calendar field using `VV.Form.GetFieldValue()` and writes it back using `VV.Form.SetFieldValue()`, **the stored date silently shifts by the user's timezone offset** — every single time. The shift compounds: after enough read-write cycles, dates cross day boundaries, month boundaries, and even year boundaries. A script running in São Paulo (UTC-3) that reads and writes back January 1st midnight will store December 31st 21:00 — the date has moved to the previous year in a single operation.

This only affects **one specific calendar field configuration**: date+time fields with the "ignore timezone" flag enabled and legacy mode disabled (the three configuration flags are explained in [Which Fields Are Affected](#which-fields-are-affected) below). Date-only fields and legacy fields are completely immune regardless of timezone.

The root cause is that `GetFieldValue()` appends a fake UTC timezone marker (`Z`) to a value that is actually in local time. When `SetFieldValue()` receives this value, it trusts the `Z` and reinterprets the local time as UTC, shifting it by the timezone offset.

**This bug is silent** — no error, no warning. The returned value looks like a perfectly valid ISO 8601 date string. Within the affected field configuration, developers testing from UTC+0 will never see the drift because their offset is zero — the fake UTC marker happens to be correct when local time equals UTC.

---

## Severity: HIGH

Progressive data corruption with no user-visible warning. Drift is proportional to timezone offset and compounds on every read-write cycle.

---

## Who Is Affected

**Only if the field is configured as date+time, ignore-timezone, non-legacy** (see [Which Fields Are Affected](#which-fields-are-affected)):

- **Developers** writing form button scripts or scheduled scripts that read the field value and write it back — a common pattern in validation, copying, and reformatting logic
- **Automated workflows** that process the field value through the `VV.Form` API
- **End users** see the corrupted dates after scripts run, even though they did not trigger the corruption directly
- **All timezones** except UTC+0, where the drift is zero by coincidence

Date-only fields, legacy fields, and date+time fields without the "ignore timezone" flag are **not affected** by this bug.

### Drift by Timezone

| Timezone              | UTC Offset | Drift per Read-Write Cycle | Cycles to Lose a Full Day | Single Cycle Crosses Year? (Jan 1) |
| --------------------- | ---------- | -------------------------- | ------------------------- | ---------------------------------- |
| BRT (São Paulo)       | UTC-3      | -3 hours                   | 8 cycles                  | **Yes** (00:00 → prev day 21:00)   |
| EST (New York)        | UTC-5      | -5 hours                   | ~5 cycles                 | **Yes**                            |
| PST/PDT (Los Angeles) | UTC-7/-8   | -7 or -8 hours             | ~3 cycles                 | **Yes**                            |
| IST (Mumbai)          | UTC+5:30   | +5:30 hours                | ~4 cycles                 | No (drifts forward)                |
| JST (Tokyo)           | UTC+9      | +9 hours                   | ~3 cycles                 | No (drifts forward)                |
| UTC+0 (London winter) | UTC+0      | **0 hours**                | Never                     | No                                 |

---

## Which Fields Are Affected

VisualVault calendar fields have three configuration flags that control their behavior. The combination of these flags determines which bugs apply:

| Flag             | What It Controls                                                           |
| ---------------- | -------------------------------------------------------------------------- |
| `enableTime`     | Whether the field stores time in addition to date (date-only vs date+time) |
| `ignoreTimezone` | Whether timezone conversion is skipped (treat value as display time)       |
| `useLegacy`      | Whether the field uses the older rendering/save code path                  |

FORM-BUG-5 affects **only one specific combination**: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`. In our test form, this is **Field5** (referred to as "Config D" in the testing matrix). No other field configuration triggers this bug.

**Why only this combination?** The internal function that transforms `GetFieldValue()` output (`getCalendarFieldValue`) has branching logic based on these flags:

- Date-only fields (`enableTime=false`): return the raw value unchanged — **safe**
- Legacy fields (`useLegacy=true`): return the raw value unchanged — **safe**
- DateTime + real timezone (`enableTime=true`, `ignoreTimezone=false`): converts to real UTC using `new Date(value).toISOString()` — **correct** (this is FORM-BUG-4's territory, but the UTC conversion itself is valid)
- **DateTime + ignore timezone (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`)**: appends a fake `Z` using a moment.js formatting trick — **FORM-BUG-5**

---

## The Problem in Detail

### What ISO 8601 "Z" Means

In date strings like `"2026-03-15T00:00:00.000Z"`, the trailing `Z` means "this time is in UTC (Coordinated Universal Time)." Any system receiving this string should interpret it as midnight UTC — not midnight in the user's local timezone.

### What the Code Actually Does

The function responsible for transforming `GetFieldValue()` output uses the moment.js date library to format the value:

```javascript
const format = 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]';
return moment(value).format(format);
```

In moment.js, square brackets `[...]` create **literal characters** — they output the enclosed text exactly as-is, regardless of the actual timezone. So `[Z]` always outputs the character `Z`, even when the value is in São Paulo time. This is different from `Z` without brackets, which would output the actual timezone offset (e.g., `-03:00`).

The result: a local-time value wearing a UTC costume. `"2026-03-15T00:00:00.000Z"` looks like midnight UTC but is actually midnight São Paulo (which is 03:00 UTC).

### How the Drift Loop Works

Here's what happens when a script reads and writes back a date value in São Paulo (UTC-3):

```
STARTING STATE: Field stores "2026-03-15T00:00:00" (midnight local, no Z — correct)

STEP 1 — Script calls GetFieldValue():
  Internal function appends fake [Z]:
  → Returns "2026-03-15T00:00:00.000Z"
  (This CLAIMS to be UTC midnight, but it's actually São Paulo midnight)

STEP 2 — Script calls SetFieldValue("2026-03-15T00:00:00.000Z"):
  Platform sees the Z and interprets the value as UTC
  → Converts UTC midnight to São Paulo local: March 14, 21:00
  → Stores "2026-03-14T21:00:00"

RESULT: The date shifted -3 hours (São Paulo's offset from UTC)
```

Each cycle repeats the same process, compounding the shift:

| Cycle | Stored Value          | Cumulative Shift  |
| :---: | --------------------- | ----------------- |
|   0   | `2026-03-15T00:00:00` | —                 |
|   1   | `2026-03-14T21:00:00` | -3 hours          |
|   2   | `2026-03-14T18:00:00` | -6 hours          |
|   3   | `2026-03-14T15:00:00` | -9 hours          |
|  ...  | ...                   | ...               |
|   8   | `2026-03-14T00:00:00` | -24 hours (1 day) |

In Mumbai (UTC+5:30), the drift goes the opposite direction: +5:30 hours per cycle.

### Year Boundary Example

In São Paulo, a single read-write cycle on January 1st midnight:

- Before: `"2026-01-01T00:00:00"`
- After: `"2025-12-31T21:00:00"` — **crossed into the previous year**

---

## Steps to Reproduce

### Prerequisites

Open a form containing a calendar field configured with `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false` (Field5 on the DateTest form).

### 1. Observe the Fake Z

```javascript
// Set a value
VV.Form.SetFieldValue('Field5', '2026-03-15T00:00:00');

// Read it back via the public API
VV.Form.GetFieldValue('Field5');
// Returns: "2026-03-15T00:00:00.000Z"  ← fake Z appended

// Compare with the actual stored value (internal API)
VV.Form.VV.FormPartition.getValueObjectValue('Field5');
// Returns: "2026-03-15T00:00:00"  ← no Z (this is what's really stored)
```

### 2. Demonstrate Progressive Drift

```javascript
// Round-trip 1
VV.Form.SetFieldValue('Field5', VV.Form.GetFieldValue('Field5'));
VV.Form.VV.FormPartition.getValueObjectValue('Field5');
// São Paulo: "2026-03-14T21:00:00" (shifted -3h)

// Round-trip 2
VV.Form.SetFieldValue('Field5', VV.Form.GetFieldValue('Field5'));
VV.Form.VV.FormPartition.getValueObjectValue('Field5');
// São Paulo: "2026-03-14T18:00:00" (shifted -6h total)
```

### 3. Demonstrate Year Boundary Crossing

```javascript
VV.Form.SetFieldValue('Field5', '2026-01-01T00:00:00');
VV.Form.SetFieldValue('Field5', VV.Form.GetFieldValue('Field5'));
VV.Form.VV.FormPartition.getValueObjectValue('Field5');
// São Paulo: "2025-12-31T21:00:00" ← crossed into previous year
```

---

## Workarounds

### Recommended: Use `GetDateObjectFromCalendar()` Instead of `GetFieldValue()`

`VV.Form.GetDateObjectFromCalendar('fieldName')` returns a native JavaScript `Date` object directly from the stored value, bypassing the function that adds the fake Z. For empty fields it returns `undefined` (falsy — safe for conditionals).

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

Setting `useLegacy=true` on the field definition causes `GetFieldValue()` to return the raw stored value without any transformation, bypassing the fake Z entirely.

**Tradeoff**: Legacy mode introduces a different issue where the calendar popup and typed input store dates in different formats ([FORM-BUG-2](bug-2-inconsistent-handlers.md)).

### Alternative: Avoid Read-Write Cycles

If you must use `GetFieldValue()`, never pass the result directly back to `SetFieldValue()`. Use `GetFieldValue()` for read-only purposes (display, validation) and source write values from a trusted origin (user input, API response, or hardcoded string).

---

## Technical Root Cause

### The Defective Function

**File**: `main.js` (bundled FormViewer application)
**Function**: `CalendarValueService.getCalendarFieldValue()` — line ~104114

This function is called internally by `VV.Form.GetFieldValue()` to transform the raw stored value before returning it to the caller. It branches based on the field's configuration flags:

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;  // V2 code path: returns raw value — no bug

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        if (fieldDef.ignoreTimezone) {
            // THE BUG — appends literal "Z" to local time:
            const format = "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]";
            return moment(value).format(format);
        }
        // Different branch for ignoreTimezone=false (FORM-BUG-4 territory):
        return new Date(value).toISOString();
    }

    return value;  // Legacy or date-only: raw value, no transformation
}
```

### The moment.js Literal Escape

| moment.js Token     | Meaning                   | Example Output                            |
| ------------------- | ------------------------- | ----------------------------------------- |
| `Z` (no brackets)   | Actual timezone offset    | `+05:30`, `-03:00`, `+00:00`              |
| `ZZ` (no brackets)  | Offset without colon      | `+0530`, `-0300`                          |
| `[Z]` (in brackets) | **Literal character "Z"** | Always outputs `Z` regardless of timezone |

The developer who wrote this format string likely intended to output a proper UTC indicator, but the square brackets made it a literal character instead. This is a well-known moment.js pitfall.

### V1 and V2 Code Paths

The VisualVault FormViewer has two versions of its calendar initialization and value-handling logic, controlled by a flag called `useUpdatedCalendarValueLogic`:

- **V1** (default, `flag = false`): The current production code path used by all standard forms. This is where FORM-BUG-5 lives.
- **V2** (`flag = true`): An updated code path that returns the raw value unchanged — no fake Z, no bug. V2 activates only when forms are opened in Object View mode (`?ObjectID=` URL parameter) or when a server-side flag is enabled. It is not active in standard form usage.

FORM-BUG-5 exists only in V1. The V2 code path already implements the correct behavior (returning the raw value), which is the basis for the recommended fix.

### How `GetFieldValue()` Reaches This Code

```
VV.Form.GetFieldValue('Field5')
  → getValueObjectValue()            Reads raw stored value: "2026-03-15T00:00:00"
  → getCalendarFieldValue()          Transforms for output (FORM-BUG-5 adds fake Z here)
  → Returns "2026-03-15T00:00:00.000Z" to the caller
```

### Interaction with Other Bugs

| Bug        | Relationship                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FORM-BUG-4 | FORM-BUG-4 strips the real `Z` when saving. FORM-BUG-5 adds a fake `Z` when reading. Together they create an asymmetric round-trip that shifts the value each cycle.                             |
| FORM-BUG-6 | Same function, same code path. FORM-BUG-6 is what happens when this function receives an empty value — it returns `"Invalid Date"` instead of `""`. Both bugs are fixed by the same code change. |
| FORM-BUG-7 | Independent mechanism. FORM-BUG-7 affects date-only fields; FORM-BUG-5 affects date+time fields. They never overlap on the same field.                                                           |

---

## Test Evidence

Testing was conducted across three timezones — São Paulo/BRT (UTC-3), Mumbai/IST (UTC+5:30), and London/UTC+0 — using both manual browser testing and automated Playwright scripts.

### GetFieldValue Output (18 of 19 tests complete — 12 PASS, 6 FAIL)

All 6 failures are FORM-BUG-5 on the affected field configuration, confirmed across all three timezones. The UTC+0 test is structurally wrong (fake Z is present) but the output coincidentally matches the true UTC value — still marked as FAIL because the mechanism is incorrect.

### Round-Trip Drift (20 of 20 complete — 9 PASS, 11 FAIL)

Drift confirmed exactly proportional to timezone offset:

- São Paulo (UTC-3): -3h per cycle
- Mumbai (UTC+5:30): +5:30h per cycle
- London (UTC+0): 0h per cycle (pass)
- Los Angeles (UTC-7, DST active): -7h per cycle
- Tokyo (UTC+9): +9h per cycle

### Year Boundary (Edge Case Testing)

São Paulo: `"2026-01-01T00:00:00"` → 1 cycle → `"2025-12-31T21:00:00"` — year boundary crossed in a single operation.

### Preset and Current Date Fields

Preset date and "Current Date" default values are stored correctly, but `GetFieldValue()` returns them with the fake Z. The drift is **latent** — the display is correct, but any script that reads and writes back will trigger the shift.

### Related Support Ticket: Freshdesk #124697

Freshdesk ticket #124697 (WADNR-10407) reports time mutation when opening forms created via the `postForms` REST API. FORM-BUG-5 is part of the chain: the API stores dates with real UTC markers, the form strips them on load, and `GetFieldValue()` adds the fake Z back — making the problem worse if scripts then write the value back.

### Independent Verification `[PLAYWRIGHT AUDIT 2026-04-06]`

All findings were independently verified through automated Playwright testing:

**TZ-Invariance Proof**: If the `Z` were a real UTC marker, reading the same stored value from São Paulo and Mumbai would produce different results (because they're at different UTC offsets). Both produced **identical output** — proving the Z is a literal character, not a real timezone conversion:

| Stored Value            | São Paulo GetFieldValue      | Mumbai GetFieldValue         | Identical? |
| ----------------------- | ---------------------------- | ---------------------------- | :--------: |
| `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` |  **Yes**   |

As a control, a different field configuration (`enableTime=true`, `ignoreTimezone=false`) that uses real UTC conversion produced **different** results from the two timezones — confirming the methodology is sound:

| Stored Value            | São Paulo GetFieldValue      | Mumbai GetFieldValue         | Identical? |
| ----------------------- | ---------------------------- | ---------------------------- | :--------: |
| `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` | `"2026-03-14T18:30:00.000Z"` |   **No**   |

Source code verified at line 104119 — the format string `"YYYY-MM-DD[T]HH:mm:ss.SSS[Z]"` confirms the literal `[Z]` escape.

---

## Proposed Fix

### Recommended: Return Raw Value (Option A)

Align the V1 behavior with V2 — return the stored value as-is, without transformation:

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;

    if (!value || value.length === 0)
        return "";  // Also fixes FORM-BUG-6 (empty field crash/truthy garbage)

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        if (fieldDef.ignoreTimezone) {
            return value;  // Return raw value — no fake Z
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

- `GetFieldValue()` on the affected field type returns the raw stored value without the fake Z
- Return format changes from `"2026-03-15T00:00:00.000Z"` to `"2026-03-15T00:00:00"`
- Read-write cycles become stable (no more progressive drift)
- Year boundary edge case eliminated

### Backwards Compatibility Risk: MEDIUM

Existing scripts that consume `GetFieldValue()` output may depend on the current format:

| Script Pattern                                       | Impact                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `if (value.endsWith('Z'))` — check for UTC indicator | Breaks — value no longer ends with Z                                                            |
| `new Date(value)` — parse as ISO                     | Works — `new Date("2026-03-15T00:00:00")` parses as local, which is correct for this field type |
| `value.substring(0, 10)` — extract date portion      | Works — date portion unchanged                                                                  |
| `moment(value).utc()` — convert to UTC               | Behavior changes — without Z, moment parses as local instead of UTC                             |

Scripts that relied on the Z being "real" were already getting wrong results — the fix makes the output honest about what it represents. Scripts that worked around the fake Z (e.g., stripping it before processing) will work correctly without changes.

### Regression Testing Scope

- All automated tests for the affected field configuration across all tested timezones
- Verify that other field configurations are completely unaffected
- Audit production scripts that call `GetFieldValue()` on affected fields for Z-dependent parsing
