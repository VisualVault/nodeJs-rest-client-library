# Bug #4: Legacy Save Format Strips Timezone

## Classification

| Field                  | Value                                                                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**           | Medium                                                                                                                                                                                          |
| **Evidence**           | `[CODE]` — Confirmed in source code. Observable in live test stored values (Z absence in raw partition values).                                                                                 |
| **Component**          | FormViewer → CalendarValueService → `getSaveValue()`                                                                                                                                            |
| **Code Path**          | V1 (default) — the `else if` branch of `getSaveValue()` when `useUpdatedCalendarValueLogic=false`                                                                                               |
| **Affected Configs**   | All configs with `enableTime=true` (C, D, G, H). Date-only configs (A, B, E, F) are unaffected because they extract only the date portion.                                                      |
| **Affected TZs**       | All — the stripped value is ambiguous in every timezone                                                                                                                                         |
| **Affected Scenarios** | 2 (Typed Input), 3 (Saved Data reload), 4 (URL Parameters), 5 (Preset Date)                                                                                                                     |
| **Related Bugs**       | Complements Bug #1 — Bug #4 strips Z on save, Bug #1 strips Z on parse/load. Together they create a double-ambiguity pattern where neither side knows the timezone context of the stored value. |

---

## Summary

The `getSaveValue()` function, which is the final transformation before a date is stored in the form partition, uses `moment(input).format('YYYY-MM-DD[T]HH:mm:ss')` for DateTime values in legacy mode (V1 default). This format string deliberately excludes the `"Z"` suffix and milliseconds. The result is a timezone-ambiguous string — there is no way to determine from the stored value alone whether `"2026-03-15T03:00:00"` represents 3 AM UTC, 3 AM BRT, or 3 AM IST. On reload, `parseDateString()` (Bug #1) interprets this value as local time in the _current_ user's timezone, which may differ from the timezone of the user who saved it.

---

## Who Is Affected

- **All users** with DateTime fields (`enableTime=true`) — Configs C, D, G, H
- **Cross-timezone teams** are most impacted: a date saved by a BRT user and loaded by an IST user will display differently because the stored local time is reinterpreted in the new timezone
- **Same-timezone users** are less visibly affected: the ambiguity exists but the double-stripping (Bug #4 on save + Bug #1 on load) cancels out when the timezone doesn't change
- **Date-only fields** (A, B, E, F) are unaffected — `getSaveValue` extracts just the `"YYYY-MM-DD"` portion, which is timezone-unambiguous

---

## Root Cause

### The Defective Code

**File**: `main.js`
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
            result = moment(input).format(format);  // ← No Z, no milliseconds
        } else {
            if (input.indexOf('T') > 0) {
                result = input.substring(0, input.indexOf('T'));  // Date-only: OK
            }
        }
    }

    return result;
}
```

### Why This Is Wrong

The `moment().format('YYYY-MM-DD[T]HH:mm:ss')` call does two destructive things:

1. **Strips the Z suffix**: The format string doesn't include `Z` or `ZZ`, so the output has no timezone indicator. The value `"2026-03-15T03:00:00.000Z"` (unambiguously UTC) becomes `"2026-03-15T00:00:00"` (ambiguous — local? UTC? which local?).

2. **Converts to local time implicitly**: `moment(input)` parses the Z-suffixed input as UTC, then `.format()` outputs in the moment instance's local timezone. So `"2026-03-15T00:00:00.000Z"` in BRT becomes `"2026-03-14T21:00:00"` — the correct local time, but stored without any indication that it's BRT.

The stored value is now **permanently ambiguous**. There is no metadata in the database to indicate which timezone the value represents. When this value is later loaded by `parseDateString()`, it is re-parsed as local time in the _loading_ user's timezone — which may be completely different from the saving user's timezone.

### What Should Happen

DateTime values should be stored with their timezone indicator preserved:

```javascript
// CORRECT: Preserve UTC marker
result = moment(input).toISOString(); // → "2026-03-15T00:00:00.000Z" (Z preserved)

// OR: Explicitly format with timezone
result = moment(input).format('YYYY-MM-DD[T]HH:mm:ss[Z]'); // → "2026-03-15T00:00:00Z"
```

For `ignoreTimezone=true` fields (Config D, H), the intended semantics is "store the display time, not UTC" — but even then, the value should include some marker so the system knows it's _not_ UTC.

---

## Expected vs Actual Behavior

### DateTime Fields — What getSaveValue Produces

| Input (from calChange)                      | Expected Stored Value                                         | Actual Stored Value (V1)            | Problem                                            |
| ------------------------------------------- | ------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------- |
| `"2026-03-15T03:00:00.000Z"`                | `"2026-03-15T03:00:00.000Z"` or `"2026-03-15T00:00:00-03:00"` | `"2026-03-15T00:00:00"`             | No timezone — ambiguous                            |
| `"2026-03-15T00:00:00.000Z"` (midnight UTC) | `"2026-03-15T00:00:00.000Z"`                                  | `"2026-03-14T21:00:00"` (BRT local) | Looks like March 14 but it's actually March 15 UTC |
| `"2026-03-15T18:30:00.000Z"`                | Preserved as-is                                               | `"2026-03-15T15:30:00"` (BRT local) | UTC context lost                                   |

### V2 vs V1 Comparison

| Mode                        | Input                        | Output                        |       Z Present?        |
| --------------------------- | ---------------------------- | ----------------------------- | :---------------------: |
| V2 (`ignoreTimezone=false`) | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"`  |            ✓            |
| V2 (`ignoreTimezone=true`)  | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"`  |            ✓            |
| **V1 (DateTime)**           | `"2026-03-15T00:00:00.000Z"` | `"2026-03-14T21:00:00"` (BRT) |          **✗**          |
| V1 (Date-only)              | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15"`                | N/A (no time component) |

### Live Evidence — Stored Values Observed

From Category 7 (SetFieldValue) test runs:

| Test ID  | Config                | TZ  | Input                        | Raw Stored Value        | Z Present? |
| -------- | --------------------- | --- | ---------------------------- | ----------------------- | :--------: |
| 7-C-isoZ | C (DateTime)          | BRT | `"2026-03-15T00:00:00.000Z"` | `"2026-03-14T21:00:00"` |     ✗      |
| 7-D-isoZ | D (DateTime+ignoreTZ) | BRT | `"2026-03-15T00:00:00Z"`     | `"2026-03-14T21:00:00"` |     ✗      |
| 7-D-isoZ | D (DateTime+ignoreTZ) | IST | `"2026-03-15T00:00:00Z"`     | `"2026-03-15T05:30:00"` |     ✗      |
| 7-G-isoZ | G (legacy DateTime)   | BRT | `"2026-03-15T00:00:00Z"`     | `"2026-03-14T21:00:00"` |     ✗      |

All DateTime stored values consistently lack the Z suffix — confirmed across configs C, D, G and timezones BRT, IST.

---

## Steps to Reproduce

1. Open a form with a DateTime field (Config C, D, G, or H)
2. Type or select a date/time (e.g., March 15 12:00 AM)
3. In DevTools console, check the raw stored value:
    ```javascript
    VV.Form.VV.FormPartition.getValueObjectValue('Field6'); // Config C
    ```
4. Observe the value is in `"YYYY-MM-DDTHH:mm:ss"` format — **no Z suffix, no timezone offset**
5. Compare with the value that went into `getSaveValue()` (which had Z from `toISOString()`)

**Cross-timezone reproduction:**

1. Save a form from BRT — a Config C field stores `"2026-03-14T21:00:00"` (BRT local midnight for March 15 UTC)
2. Switch system timezone to IST and reload the same record
3. `parseDateString()` interprets `"2026-03-14T21:00:00"` as IST local time → converts to UTC as `"2026-03-14T15:30:00.000Z"` — a completely different UTC instant than what was saved

---

## Test Evidence

- **Code analysis**: `getSaveValue()` source confirmed at line ~104100. The `moment(input).format('YYYY-MM-DD[T]HH:mm:ss')` format string visibly lacks Z.
- **Live observation**: All Category 7 test runs for DateTime configs show Z-less stored values (see table above)
- **Cross-timezone evidence**: Category 3 tests (Server Reload) — `tc-3-C-BRT-IST` shows 8.5h shift when reloading a BRT-saved record from IST, consistent with the stored local time being reinterpreted in the new timezone
- **Database evidence**: TC-2.10 (DB storage) confirmed that user-input DateTime fields store `"3/15/2026 12:00:00 AM"` — the DB representation also lacks timezone context

**Test counts** (Bug #4 is not the primary failure in most tests — it enables failures in combination with Bug #1):

- Category 2 (Typed Input): 16/16 complete — 11P, 5F
- Category 3 (Server Reload): 18/18 complete — 14P, 4F (4 failures involve cross-TZ or legacy format issues)
- Category 7 (SetFieldValue): 38/39 done — 29P, 9F

---

## Impact Analysis

### Data Integrity

The stored value is **permanently timezone-ambiguous**. Once Z is stripped, the information about whether `"2026-03-15T00:00:00"` represents UTC midnight or local midnight is irrecoverably lost. This affects:

- **Cross-timezone reloads**: A value saved from BRT and loaded from IST is reinterpreted with an 8.5-hour shift
- **Database queries**: SQL `WHERE` clauses comparing DateTime values across records saved from different timezones will match incorrectly
- **API reads**: The REST API normalizes all dates to ISO+Z on read (CB-7 from WS investigation), but the underlying data is ambiguous — the API adds Z to what may be a local-time value

### The Double-Stripping Pattern

Bug #4 and Bug #1 form a complementary pair:

```
SAVE PATH:  Date object → toISOString() → "...Z" → getSaveValue() → strips Z → stored as "..."
LOAD PATH:  stored "..." → parseDateString() → strips Z (noop, already gone) → parses as local
```

For **same-timezone** users, this is self-consistent: the local time stored on save matches the local time assumed on load. The bugs cancel out.

For **cross-timezone** users, the chain breaks: BRT local time stored on save is assumed to be IST local time on load — a fundamentally different UTC instant.

### Interaction with Other Bugs

| Bug    | Interaction                                                                                                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bug #1 | Complementary — Bug #4 strips Z on save, Bug #1 would strip Z on load. Since Bug #4 already removed Z, Bug #1's strip is a no-op, but the re-parse as local time applies to the wrong timezone context.       |
| Bug #3 | Bug #3 hardcodes `enableTime=true` for saved data in V2. If V2's `getSaveValue` is used (which preserves Z), the hardcoded parameter changes how the Z-preserved value is processed.                          |
| Bug #5 | Bug #5 adds fake `[Z]` on read (Config D). The value stored by Bug #4 without Z gets fake Z added back — but as a literal character, not a real timezone marker. The fake Z then causes drift on round-trips. |

### Severity Assessment

Medium severity because:

- Same-timezone usage (the majority of deployments) is not visibly affected
- Cross-timezone impact is real but rare (requires multi-timezone teams sharing forms)
- The V2 code path correctly preserves Z — this bug is V1-only and will be resolved when V2 is enabled globally

---

## Workarounds

1. **Enable V2 code path**: If `useUpdatedCalendarValueLogic` can be set to `true` (via server flag or Object View context), `getSaveValue()` preserves the Z suffix. However, this activates the V2 code path globally, which may have other implications.

2. **Use `ignoreTimezone=true` (Config D)**: For Config D, `getSaveValue` still strips Z (same behavior), but the _intent_ of ignoreTimezone is to store display time — so the ambiguity is by design. This doesn't fix the bug but aligns with the intended semantics.

3. **Server-side date handling**: Write dates via the REST API instead of the Forms UI. The API stores values in ISO+Z format (CB-7, CB-29), bypassing `getSaveValue()` entirely.

4. **Same-timezone deployment**: If all users accessing a form are in the same timezone, the double-stripping pattern (Bug #4 + Bug #1) is self-consistent and produces correct results. This is the implicit workaround most deployments rely on today.

---

## Proposed Fix

### Before (Current — V1 Legacy Branch)

```javascript
getSaveValue(input, enableTime, ignoreTimezone) {
    let result = typeof input === 'string' ? input : input.toISOString();

    if (this.useUpdatedCalendarValueLogic) {
        // V2 — preserves timezone ✓
        result = ignoreTimezone
            ? moment(input).tz('UTC', true).toISOString()
            : moment(input).toISOString();
    } else if (input.length > 0) {
        if (enableTime) {
            const format = 'YYYY-MM-DD[T]HH:mm:ss';
            result = moment(input).format(format);  // ← STRIPS Z AND MILLISECONDS
        } else {
            if (input.indexOf('T') > 0) {
                result = input.substring(0, input.indexOf('T'));
            }
        }
    }

    return result;
}
```

### After (Fixed)

```javascript
getSaveValue(input, enableTime, ignoreTimezone) {
    let result = typeof input === 'string' ? input : input.toISOString();

    if (input.length > 0) {
        if (enableTime) {
            // Always preserve timezone information
            result = moment(input).toISOString();  // → "2026-03-15T00:00:00.000Z" (Z preserved)
        } else {
            if (input.indexOf('T') > 0) {
                result = input.substring(0, input.indexOf('T'));  // Date-only: extract date portion
            }
        }
    }

    return result;
}
```

### Key Changes

1. **Replace `moment().format('YYYY-MM-DD[T]HH:mm:ss')` with `moment().toISOString()`** — preserves Z suffix and milliseconds
2. **Remove the V1/V2 branching** — both paths should preserve timezone. The `ignoreTimezone` flag should affect display formatting only, not storage.
3. **Date-only path unchanged** — extracting `"YYYY-MM-DD"` is correct for date-only fields

---

## Fix Impact Assessment

### What Changes If Fixed

- All DateTime values stored with Z suffix (UTC marker preserved)
- Cross-timezone reloads produce correct dates (parseDateString receives unambiguous input)
- Stored values are self-documenting — `"2026-03-15T00:00:00.000Z"` is unambiguously UTC
- The double-stripping pattern (Bug #4 + Bug #1) is broken — Bug #1 would still strip Z on load, but if Bug #1 is also fixed, the full save-load chain preserves timezone

### Backwards Compatibility Risk

**HIGH** — This is the most significant compatibility concern across all 7 bugs.

- **Existing data**: All DateTime values currently in the database are stored without Z in local-time format. If Bug #4 is fixed but Bug #1 is not, `parseDateString()` would receive Z-suffixed values and strip them — but the semantic meaning changes (now it's stripping a _real_ Z, not a missing one).
- **Both bugs must be fixed together**: Bug #1 and Bug #4 form a complementary pair. Fixing one without the other creates a new inconsistency.
- **Data migration**: Existing stored values cannot be retroactively fixed — there's no way to determine which timezone they were saved from. A migration would need to either:
    - Assume all values are in a known timezone (risky if multi-TZ teams exist)
    - Leave old data as-is and only fix new saves (creates a format inconsistency within the same database)

### Regression Risk

- **High traffic function**: `getSaveValue()` is called on every save for every calendar field. Any change here affects all form saves platform-wide.
- **Format change**: Downstream systems (reports, APIs, scheduled scripts) that parse the stored format may break if they expect the Z-less format.
- **Must coordinate with Bug #1 fix**: The save and load paths must be updated in lockstep to avoid introducing new inconsistencies.
- **Testing scope**: All 8 configurations × DateTime scenarios × multiple timezones must be regression-tested.
