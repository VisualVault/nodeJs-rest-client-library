# FORM-BUG-4: Timezone Marker Stripped When Saving Date+Time Fields

## What Happens

When a user saves a form with a date+time calendar field, the system permanently removes the UTC timezone marker (`Z`) from the value before storing it. The result is a datetime string like `"2026-03-15T00:00:00"` — there is no way to determine from this stored value alone whether it represents midnight UTC, midnight São Paulo, or midnight Mumbai. The timezone context is irrecoverably lost.

**For users in the same timezone**, this is invisible. The save path strips the timezone marker, and the load path re-parses the value as local time — since both happen in the same timezone, the date displays correctly. The two bugs (stripping on save and re-interpreting on load) cancel each other out.

**For cross-timezone teams**, the system breaks. A date saved by a user in São Paulo (UTC-3) and loaded by a user in Mumbai (UTC+5:30) will be reinterpreted with an 8.5-hour shift — the stored local time from São Paulo is treated as Mumbai local time, a completely different moment.

This only affects **date+time fields** (`enableTime=true`). Date-only fields are unaffected because their save path extracts just the `"YYYY-MM-DD"` portion, which is timezone-unambiguous.

---

## Severity: MEDIUM

Same-timezone usage (the majority of deployments) is not visibly affected. Cross-timezone impact is real but less common. The V2 code path correctly preserves the timezone marker — this bug is V1-only and will be resolved when V2 is enabled globally.

---

## Who Is Affected

- **Cross-timezone teams** sharing forms — a date saved from one timezone and loaded from another will display differently. The shift equals the difference between the two timezones (e.g., 8.5 hours between São Paulo and Mumbai).
- **SQL queries and reports** comparing datetime values across records saved by users in different timezones — the stored values represent different moments even for the same intended time.
- **REST API consumers** reading form data — the API normalizes all dates to ISO+Z on read, but the underlying data is ambiguous. The API adds a `Z` to what may be a local-time value, creating a [similar problem to FORM-BUG-5](bug-5-fake-z-drift.md).
- **Same-timezone users** are not visibly affected — the double-stripping pattern (strip on save + re-parse on load) is self-consistent when the timezone doesn't change.

---

## Which Fields Are Affected

Calendar fields have three configuration flags:

| Flag             | What It Controls                                                           |
| ---------------- | -------------------------------------------------------------------------- |
| `enableTime`     | Whether the field stores time in addition to date (date-only vs date+time) |
| `ignoreTimezone` | Whether timezone conversion is skipped (treat value as display time)       |
| `useLegacy`      | Whether the field uses the older rendering/save code path                  |

FORM-BUG-4 affects **all date+time fields** (`enableTime=true`) regardless of the other two flags:

| Config | enableTime | ignoreTimezone | useLegacy | Affected?                             |
| :----: | :--------: | :------------: | :-------: | ------------------------------------- |
|   C    |  **true**  |      off       |    off    | **Yes** — Z stripped on save          |
|   D    |  **true**  |       on       |    off    | **Yes** — Z stripped on save          |
|   G    |  **true**  |      off       |    on     | **Yes** — Z stripped on save          |
|   H    |  **true**  |       on       |    on     | **Yes** — Z stripped on save          |
|   A    |    off     |      off       |    off    | No — date-only, extracts date portion |
|   B    |    off     |       on       |    off    | No — date-only                        |
|   E    |    off     |      off       |    on     | No — date-only                        |
|   F    |    off     |       on       |    on     | No — date-only                        |

---

## The Problem in Detail

### The Save Chain

When a user enters a date+time value (via typed input, calendar popup, or `SetFieldValue`), the value flows through this chain before being stored:

```
User enters date
    ↓
Handler converts to Date object → .toISOString()
    → "2026-03-15T03:00:00.000Z" (correct UTC, with Z)
    ↓
getSaveValue() formats for storage
    → moment("...Z").format("YYYY-MM-DD[T]HH:mm:ss")
    → "2026-03-15T00:00:00" (Z STRIPPED, milliseconds removed)
    ↓
Stored in form partition and sent to server
    ↓
SQL Server stores as datetime: 2026-03-15 00:00:00.000 (timezone-unaware)
```

The critical step is `getSaveValue()`. Its format string `'YYYY-MM-DD[T]HH:mm:ss'` deliberately excludes `Z` (or any timezone designator) and milliseconds. The `moment(input)` call also implicitly converts from UTC to local time before formatting — so `"2026-03-15T00:00:00.000Z"` (UTC midnight) becomes `"2026-03-14T21:00:00"` in São Paulo (UTC-3).

### What the Stored Value Means — Or Doesn't

After Z is stripped, the value `"2026-03-15T00:00:00"` is ambiguous:

| If saved from...  | The value means...      | UTC equivalent       |
| ----------------- | ----------------------- | -------------------- |
| São Paulo (UTC-3) | Midnight São Paulo time | 2026-03-15 03:00 UTC |
| Mumbai (UTC+5:30) | Midnight Mumbai time    | 2026-03-14 18:30 UTC |
| London (UTC+0)    | Midnight UTC            | 2026-03-15 00:00 UTC |

All three users intended midnight March 15 local time. All three produce the same stored string `"2026-03-15T00:00:00"`. But these represent three different moments in time, and the database cannot distinguish between them.

### The Double-Stripping Pattern

FORM-BUG-4 and [FORM-BUG-1](bug-1-timezone-stripping.md) form a complementary pair:

```
SAVE PATH (FORM-BUG-4):
  Date object → .toISOString() → "...Z" → getSaveValue() → strips Z → stored as "..."

LOAD PATH (FORM-BUG-1 / V1 equivalent):
  Stored "..." → parseDateString() or inline code → strips Z (no-op, already gone) → parses as local
```

**Same-timezone round-trip**: São Paulo saves `"2026-03-15T00:00:00"` (local midnight). São Paulo reloads → parses as São Paulo local midnight → displays March 15 00:00. **Correct** — the two bugs cancel out.

**Cross-timezone round-trip**: São Paulo saves `"2026-03-15T00:00:00"` (São Paulo midnight = 03:00 UTC). Mumbai reloads → parses as Mumbai local midnight (= 18:30 UTC on March 14). **Wrong** — the date has shifted 8.5 hours and crossed a day boundary.

### What Should Happen

DateTime values should preserve their timezone indicator:

```javascript
// CORRECT: Preserve UTC marker
result = moment(input).toISOString(); // → "2026-03-15T00:00:00.000Z" (Z preserved)
```

The V2 code path already does this — `getSaveValue()` under V2 uses `moment(input).toISOString()` (for `ignoreTimezone=false`) or `moment(input).tz('UTC', true).toISOString()` (for `ignoreTimezone=true`), both of which preserve the `Z` suffix.

---

## Steps to Reproduce

1. Open a form with a date+time field (e.g., Field6: Config C, or Field5: Config D)
2. Type or select a date/time (e.g., March 15, 12:00 AM)
3. In DevTools console, check the raw stored value:
    ```javascript
    VV.Form.VV.FormPartition.getValueObjectValue('Field6');
    // Returns: "2026-03-15T00:00:00"  — no Z suffix, no timezone info
    ```
4. Compare with the ISO value that went into `getSaveValue()` (which had `Z` from `.toISOString()`):
    - The input was `"2026-03-15T03:00:00.000Z"` (in São Paulo)
    - The stored output is `"2026-03-15T00:00:00"` — Z gone, milliseconds gone, time converted to local

**Cross-timezone reproduction:**

1. Save a form from São Paulo — a Config C field stores `"2026-03-15T00:00:00"` (São Paulo local midnight)
2. Switch system timezone to Mumbai and reload the same record
3. The load path interprets `"2026-03-15T00:00:00"` as Mumbai local time → converts to UTC as `"2026-03-14T18:30:00.000Z"` — a completely different UTC instant from what was saved

---

## Workarounds

### 1. Same-Timezone Deployment

If all users accessing a form are in the same timezone, the double-stripping pattern is self-consistent. This is the implicit workaround most deployments rely on today.

### 2. Server-Side Date Handling

Write dates via the REST API instead of the Forms UI. The API stores values in ISO+Z format, bypassing `getSaveValue()` entirely.

### 3. Use `ignoreTimezone=true` (Config D)

For Config D, `getSaveValue` still strips Z (same behavior), but the _intent_ of `ignoreTimezone` is to store display time — so the ambiguity is by design. This doesn't fix the bug but aligns with the field's intended semantics.

### 4. Enable V2 Code Path

If `useUpdatedCalendarValueLogic` can be set to `true` (via server flag or Object View context), `getSaveValue()` preserves the Z suffix. However, V2 has its own bugs ([FORM-BUG-1](bug-1-timezone-stripping.md), [FORM-BUG-3](bug-3-hardcoded-params.md)) that must be fixed first.

---

## Test Evidence

Testing conducted across São Paulo/BRT (UTC-3) and Mumbai/IST (UTC+5:30) using direct function invocation, end-to-end verification, and automated Playwright regression.

### Direct Function Invocation — getSaveValue() Z-Stripping

**São Paulo (UTC-3):**

| Input                                       | Output                  | Z Present? |
| ------------------------------------------- | ----------------------- | :--------: |
| `"2026-03-15T00:00:00.000Z"` (UTC midnight) | `"2026-03-14T21:00:00"` |   **No**   |
| `"2026-03-15T03:00:00.000Z"` (BRT midnight) | `"2026-03-15T00:00:00"` |   **No**   |
| `"2026-03-15T00:00:00"` (no Z)              | `"2026-03-15T00:00:00"` |   **No**   |

**Mumbai (UTC+5:30):**

| Input                                       | Output                  | Z Present? |
| ------------------------------------------- | ----------------------- | :--------: |
| `"2026-03-15T00:00:00.000Z"` (UTC midnight) | `"2026-03-15T05:30:00"` |   **No**   |

### Direct Function Invocation — GetFieldValue Reinterpretation

The same stored value `"2026-03-15T00:00:00"` fed through `GetFieldValue()` output transformation:

| Config | GetFieldValue Output         | Changed from Raw? | Bug                               |
| ------ | ---------------------------- | :---------------: | --------------------------------- |
| C      | `"2026-03-15T03:00:00.000Z"` |      **Yes**      | FORM-BUG-4 (+3h reinterpretation) |
| D      | `"2026-03-15T00:00:00.000Z"` |      **Yes**      | FORM-BUG-5 (fake Z)               |
| G      | `"2026-03-15T00:00:00"`      |        No         | Safe (legacy passthrough)         |
| H      | `"2026-03-15T00:00:00"`      |        No         | Safe (legacy passthrough)         |

Config C's `GetFieldValue` applies `new Date(value).toISOString()` — a real UTC conversion. The stored local-time value `"2026-03-15T00:00:00"` is reinterpreted as São Paulo local midnight and converted to UTC (+3h). This is a downstream effect of FORM-BUG-4: because the stored value has no timezone marker, `GetFieldValue` treats it as local time.

Legacy configs (G, H) are immune — `GetFieldValue` returns the raw stored value unchanged.

### End-to-End Verification

**São Paulo, Config C, typed "03/15/2026 12:00 AM":**

- Raw stored: `"2026-03-15T00:00:00"` — Z stripped by getSaveValue (FORM-BUG-4)
- GetFieldValue: `"2026-03-15T03:00:00.000Z"` — reinterpreted as local → UTC (+3h)

**Mumbai, Config C, typed "03/15/2026 12:00 AM":**

- Raw stored: `"2026-03-15T00:00:00"` — Z stripped by getSaveValue (FORM-BUG-4)
- GetFieldValue: `"2026-03-14T18:30:00.000Z"` — reinterpreted as Mumbai local → UTC (-5.5h, crosses day boundary)

### Playwright Regression

- Category 2 (Typed Input): 16/16 complete — 11 PASS, 5 FAIL
- Category 3 (Server Reload): 18/18 complete — 10 PASS, 8 FAIL (corrected from 14P/4F)
- Category 7 (SetFieldValue): 38/39 done — 29 PASS, 9 FAIL
- Playwright Cat 2 TC-2-C-BRT: FAIL at API assertion — confirms FORM-BUG-4 via automated test

### Source Code Verification

- `getSaveValue()` confirmed at line 104106 — format string `'YYYY-MM-DD[T]HH:mm:ss'` visibly lacks Z
- `getCalendarFieldValue()` confirmed at line 104122 — `new Date(t).toISOString()` reinterprets Z-less value
- V2 path correctly preserves Z in both functions

---

## Technical Root Cause

### The Defective Function

**File**: `main.js` (bundled FormViewer application)
**Function**: `CalendarValueService.getSaveValue()` — line ~104100

```javascript
getSaveValue(input, enableTime, ignoreTimezone) {
    let result = typeof input === 'string' ? input : input.toISOString();

    if (this.useUpdatedCalendarValueLogic) {
        // V2 path — preserves timezone ✓
        result = ignoreTimezone
            ? moment(input).tz('UTC', true).toISOString()   // Keeps Z
            : moment(input).toISOString();                    // Keeps Z
    } else if (input.length > 0) {
        // V1 path (DEFAULT) — strips timezone ✗
        if (enableTime) {
            const format = 'YYYY-MM-DD[T]HH:mm:ss';
            result = moment(input).format(format);  // No Z, no milliseconds
        } else {
            if (input.indexOf('T') > 0) {
                result = input.substring(0, input.indexOf('T'));  // Date-only: OK
            }
        }
    }

    return result;
}
```

The V1 `moment().format('YYYY-MM-DD[T]HH:mm:ss')` call does two destructive things:

1. **Strips the Z suffix**: The format string doesn't include `Z` or `ZZ`, so the output has no timezone indicator.
2. **Converts to local time implicitly**: `moment(input)` parses Z-suffixed input as UTC, then `.format()` outputs in the user's local timezone. So `"2026-03-15T00:00:00.000Z"` in São Paulo becomes `"2026-03-14T21:00:00"` — the correct local time, but stored without any indication that it's São Paulo time.

### Where This Function Is Called

`getSaveValue()` is called on every save operation for every calendar field — it is the final transformation before the value is sent to the server. It sits at the end of both the popup and typed-input save chains.

### Interaction with Other Bugs

| Bug        | Relationship                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| FORM-BUG-1 | Complementary pair: FORM-BUG-4 strips Z on save, FORM-BUG-1 strips Z on load. Self-consistent for same-TZ, breaks for cross-TZ.        |
| FORM-BUG-5 | Config D: `GetFieldValue` adds fake `[Z]` to the Z-less stored value. Different manifestation but same root pattern.                   |
| FORM-BUG-3 | V2 hardcoded params feed into `getSaveValue()` which would preserve Z under V2 — FORM-BUG-3 affects the parse but not the save format. |

---

## Proposed Fix

### Before (Current — V1 Path)

```javascript
if (enableTime) {
    const format = 'YYYY-MM-DD[T]HH:mm:ss';
    result = moment(input).format(format); // Strips Z and milliseconds
}
```

### After (Fixed)

```javascript
if (enableTime) {
    result = moment(input).toISOString(); // Preserves Z and full precision
}
```

### Key Changes

1. **Replace `moment().format(...)` with `moment().toISOString()`** — preserves Z suffix and milliseconds
2. **Remove V1/V2 branching** — both paths should preserve timezone. The `ignoreTimezone` flag should affect display formatting only, not storage.
3. **Date-only path unchanged** — extracting `"YYYY-MM-DD"` is correct for date-only fields

---

## Fix Impact Assessment

### What Changes If Fixed

- All datetime values stored with Z suffix (UTC marker preserved)
- Cross-timezone reloads produce correct dates
- Stored values are self-documenting — `"2026-03-15T00:00:00.000Z"` is unambiguously UTC
- The double-stripping pattern (FORM-BUG-4 + FORM-BUG-1) is broken — if FORM-BUG-1 is also fixed, the full save-load chain preserves timezone

### Backwards Compatibility Risk: HIGH

**This is the most significant compatibility concern across all 7 bugs.**

- **Existing data**: All datetime values currently in the database are stored without Z in local-time format. If FORM-BUG-4 is fixed but FORM-BUG-1 / V1 load path is not, the load path would receive Z-suffixed values and handle them differently than before.
- **Both bugs must be fixed together**: FORM-BUG-1 and FORM-BUG-4 form a complementary pair. Fixing one without the other creates a new inconsistency.
- **Data migration dilemma**: Existing stored values cannot be retroactively fixed — there's no way to determine which timezone they were saved from. Options:
    - **No migration**: Fix code only, old data stays wrong — users see old dates shift on display
    - **Blanket shift**: Add offset to all datetime values from known-TZ users — risks corrupting records where the stored value was intentional
    - **Accept mixed state**: Old dates wrong, new dates correct — inconsistency in the same database
- **Recommendation**: Fix the code. Do not attempt data migration. The existing wrong data is consistently wrong within same-timezone deployments, and the fix prevents future corruption.

### Regression Risk: HIGH

- **High-traffic function**: `getSaveValue()` is called on every save for every calendar field. Any change affects all form saves platform-wide.
- **Format change**: Downstream systems (reports, APIs, scheduled scripts) that parse the stored format may break if they expect the Z-less format.
- **Must coordinate with FORM-BUG-1 fix**: The save and load paths must be updated in lockstep.
- **Testing scope**: All 8 configurations × datetime scenarios × multiple timezones must be regression-tested.

### Artifacts Created During Investigation

- `testing/scripts/audit-bug4-save-format.js` — comprehensive audit script (5 tests, São Paulo + Mumbai)
