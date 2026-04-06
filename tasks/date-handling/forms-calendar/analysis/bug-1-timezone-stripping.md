# FORM-BUG-1: Timezone Marker Stripped From Dates During Form Load

## What Happens

When a form with calendar fields is loaded — whether from saved data, a preset default, or a URL parameter — the system strips the UTC timezone marker (`Z`) from date values before parsing them. This changes the meaning of the date: a value that represents midnight UTC becomes midnight in the user's local timezone, silently shifting the stored date by the user's timezone offset.

For example, if a date was saved as `"2026-03-15T00:00:00.000Z"` (midnight UTC, March 15), a user in Mumbai (UTC+5:30) loading this form would get the value reinterpreted as midnight Mumbai time — which is actually 18:30 UTC on March 14. The date has shifted backward by 5.5 hours without any warning.

**Current scope**: This defect exists in an updated version of the form loading code (called "V2") that is **not yet active in standard production forms**. However, the current production code ("V1") contains equivalent inline code that produces the same conceptual problem through different means. See [Background](#background-how-the-form-loads-dates) for what V1 and V2 mean and when each runs.

---

## Severity: MEDIUM

The V2 function where this bug lives is not called in standard form usage today. The V1 production code has equivalent Z-handling behavior, but its effects are absorbed into the other bugs in this investigation (primarily [FORM-BUG-7](bug-7-wrong-day-utc-plus.md) for date-only fields and [FORM-BUG-4](bug-4-legacy-save-format.md) for DateTime fields). This bug becomes actionable when V2 is enabled globally.

---

## Who Is Affected

**V2 code path** (not the default — requires specific activation):

- Forms opened in **Object View mode** (`?ObjectID=` URL parameter)
- Forms opened with a non-empty `modelId` context
- Accounts where the `useUpdatedCalendarValueLogic` server flag is enabled
- All field configurations (date-only and date+time alike)
- All timezones except UTC+0

**V1 code path** (the default for all standard forms):

- Not affected by this specific function (`parseDateString` is never called)
- Affected by equivalent inline code that strips `Z` in similar ways — these effects are documented under [FORM-BUG-4](bug-4-legacy-save-format.md) (save path) and [FORM-BUG-7](bug-7-wrong-day-utc-plus.md) (date-only parsing)

---

## Background: How the Form Loads Dates

The VisualVault FormViewer has two versions of its calendar field initialization logic, controlled by an internal flag called `useUpdatedCalendarValueLogic`:

- **V1** (`flag = false`, the default): The current production code path used by all standard standalone forms. When a form loads, V1 processes saved dates through inline code in a function called `initCalendarValueV1()`. This code handles timezone markers on a case-by-case basis — sometimes stripping them, sometimes preserving them, depending on the field configuration.

- **V2** (`flag = true`): An updated code path intended as V1's successor. V2 routes all date parsing through a centralized function called `parseDateString()`. This function is where FORM-BUG-1 lives. V2 activates only in specific contexts:
    - Forms opened via Object View (`?ObjectID=` in the URL)
    - Forms with a `modelId` context
    - Accounts with the server-side flag enabled

**All testing in this investigation was conducted against V1** (the default). V2 could not be activated on the test environment.

The three **field configuration flags** referenced throughout this document:

| Flag             | What It Controls                                                           |
| ---------------- | -------------------------------------------------------------------------- |
| `enableTime`     | Whether the field stores time in addition to date (date-only vs date+time) |
| `ignoreTimezone` | Whether timezone conversion is skipped (treat value as display time)       |
| `useLegacy`      | Whether the field uses the older rendering/save code path                  |

---

## The Problem in Detail

### What the "Z" Means

In ISO 8601 date strings, the trailing `Z` is a timezone designator meaning "this time is in UTC (Coordinated Universal Time)":

- `"2026-03-15T00:00:00.000Z"` = March 15, midnight **UTC**
- `"2026-03-15T00:00:00.000"` = March 15, midnight **in whatever the local timezone is**

These represent different moments in time for anyone not in UTC+0. In São Paulo (UTC-3), midnight UTC is 9 PM the previous evening. In Mumbai (UTC+5:30), midnight UTC is 5:30 AM the same day.

### What the Code Does

The `parseDateString()` function's first operation is to unconditionally remove the `Z`:

```javascript
let stripped = input.replace('Z', '');
// "2026-03-15T00:00:00.000Z" becomes "2026-03-15T00:00:00.000"
```

After this, the value is parsed as if it were in the user's local timezone. The UTC context is permanently lost.

### Step-by-Step Example

A date is saved as `"2026-03-15T00:00:00.000Z"` (midnight UTC, March 15). A user in Mumbai loads this form with V2 active:

```
1. parseDateString receives: "2026-03-15T00:00:00.000Z"
2. Strips Z:                 "2026-03-15T00:00:00.000"
3. Parses as Mumbai local:   March 15, 00:00 IST = March 14, 18:30 UTC
4. Stores internally:        "2026-03-14T18:30:00.000Z"

Result: The date shifted backward by 5.5 hours (Mumbai's UTC offset)
```

For a user in São Paulo loading the same value:

```
1. parseDateString receives: "2026-03-15T00:00:00.000Z"
2. Strips Z:                 "2026-03-15T00:00:00.000"
3. Parses as São Paulo local: March 15, 00:00 BRT = March 15, 03:00 UTC
4. Stores internally:         "2026-03-15T03:00:00.000Z"

Result: The date shifted forward by 3 hours (São Paulo's UTC offset)
```

For a user in London (UTC+0):

```
1-4: No shift — local time equals UTC. The bug is invisible.
```

### The Recovery Branch — Partially Works, Partially Backfires

The function has a second branch for fields where `ignoreTimezone` is `false`. After stripping the Z, it attempts to recover the UTC meaning using `.tz("UTC", true).local()`:

- **For date+time fields**: The recovery works correctly — it re-labels the local-parsed time as UTC and converts to local. Verified at 0h shift in São Paulo, Mumbai, and London.
- **For date-only fields**: The recovery **backfires in UTC- timezones**. The `.local()` conversion shifts midnight backward (e.g., -3h in São Paulo), crossing into the previous calendar day. Then a `.startOf("day")` call snaps to that previous day's midnight. Result: **-1 day error** in São Paulo.

This means the `ignoreTimezone=false` branch is paradoxically **worse** than `ignoreTimezone=true` for date-only fields in UTC- timezones:

| Timezone  | ignoreTimezone=false + date-only           | ignoreTimezone=true + date-only   |
| --------- | ------------------------------------------ | --------------------------------- |
| São Paulo | **-1 day** (recovery backfire)             | +3h (wrong time, but correct day) |
| Mumbai    | **-1 day** (recovery shifts past midnight) | -5.5h (wrong time, correct day)   |
| London    | Correct                                    | Correct                           |

---

## The V1 Equivalent

V1 does not call `parseDateString()` — this was verified by instrumenting the function during automated testing (zero calls logged during V1 operations). However, V1 has inline code in `initCalendarValueV1()` that handles the Z marker on a case-by-case basis:

| V1 Inline Code                                     | What It Does                                               | Equivalent To                       |
| -------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------- |
| `this.data.value.replace("Z", "")` + `new Date(e)` | Strips Z, parses as local (DateTime + ignoreTimezone=true) | parseDateString(input, true, true)  |
| `new Date(this.data.value)` (ignoreTimezone=false) | Preserves Z, correct parse                                 | parseDateString(input, true, false) |
| T-truncation + `moment(dateString).toDate()`       | Strips everything after T, parses date as local midnight   | This is FORM-BUG-7, not FORM-BUG-1  |

The V1 inline `replace("Z","") + new Date()` produces identical output to `parseDateString(input, true, true)` — verified at both São Paulo and Mumbai timezones.

### Relationship to FORM-BUG-7

The original analysis stated that FORM-BUG-1 is "the root enabler for FORM-BUG-7." **This was corrected during the audit — it is incorrect for V1.**

- FORM-BUG-7 in V1 is caused by `moment(dateOnlyString).toDate()` parsing date-only strings as local midnight — a completely independent mechanism
- In V1's date-only path, the time portion (including any Z) is truncated before parsing, so Z-stripping is incidental, not causal
- FORM-BUG-1 would only enable FORM-BUG-7 in V2, where `parseDateString` is called with the full ISO string including Z

The two bugs are conceptual siblings (both stem from local-time reinterpretation) but operate through different code paths.

---

## Test Evidence

All testing conducted via automated Playwright scripts across three timezones: São Paulo/BRT (UTC-3), Mumbai/IST (UTC+5:30), and London/UTC+0. 19 tests per timezone, 5 verification phases.

Spec file: `testing/date-handling/audit-bug1-tz-stripping.spec.js`

### parseDateString() Output by Timezone

**Input: `"2026-03-15T00:00:00.000Z"` (midnight UTC)**

| enableTime | ignoreTZ | São Paulo (UTC-3)                       | Mumbai (UTC+5:30)                       | London (UTC+0)             | Correct Value              |
| ---------- | -------- | --------------------------------------- | --------------------------------------- | -------------------------- | -------------------------- |
| true       | true     | `2026-03-15T03:00:00.000Z` (+3h)        | `2026-03-14T18:30:00.000Z` (-5.5h)      | `2026-03-15T00:00:00.000Z` | `2026-03-15T00:00:00.000Z` |
| true       | false    | `2026-03-15T00:00:00.000Z`              | `2026-03-15T00:00:00.000Z`              | `2026-03-15T00:00:00.000Z` | `2026-03-15T00:00:00.000Z` |
| false      | true     | `2026-03-15T03:00:00.000Z` (same day)   | `2026-03-14T18:30:00.000Z` (**-1 day**) | `2026-03-15T00:00:00.000Z` | `2026-03-15T00:00:00.000Z` |
| false      | false    | `2026-03-14T03:00:00.000Z` (**-1 day**) | `2026-03-14T18:30:00.000Z` (**-1 day**) | `2026-03-15T00:00:00.000Z` | `2026-03-15T00:00:00.000Z` |

**Input: `"2026-03-15T12:00:00.000Z"` (noon UTC)**

| enableTime | ignoreTZ | São Paulo                                                | Mumbai                                         | London                     |
| ---------- | -------- | -------------------------------------------------------- | ---------------------------------------------- | -------------------------- |
| true       | true     | `2026-03-15T15:00:00.000Z` (+3h)                         | `2026-03-15T06:30:00.000Z` (-5.5h)             | `2026-03-15T12:00:00.000Z` |
| false      | true     | `2026-03-15T03:00:00.000Z` (collapsed to local midnight) | `2026-03-14T18:30:00.000Z` (-1 day, collapsed) | `2026-03-15T00:00:00.000Z` |

**Input: `"2026-03-15"` (date-only string, no Z)**

| enableTime | ignoreTZ | São Paulo                               | Mumbai                              | London                     |
| ---------- | -------- | --------------------------------------- | ----------------------------------- | -------------------------- |
| false      | false    | `2026-03-14T03:00:00.000Z` (**-1 day**) | `2026-03-14T18:30:00.000Z` (-1 day) | `2026-03-15T00:00:00.000Z` |
| false      | true     | `2026-03-15T03:00:00.000Z` (same day)   | `2026-03-14T18:30:00.000Z` (-1 day) | `2026-03-15T00:00:00.000Z` |

### V1 Call Trace Verification

Monkey-patched `parseDateString` during V1 operations (typed input, SetFieldValue, calendar popup) — **zero calls logged**. Confirms `parseDateString` is V2-only.

V1 inline `replace("Z","") + new Date()` tested against `parseDateString(input, true, true)` at both São Paulo and Mumbai — **identical output**.

### Cross-Timezone Saved Record Reload

**Record saved from São Paulo, loaded in 3 timezones:**

| Field  | Configuration       | São Paulo Load        | Mumbai Load           | London Load           |
| ------ | ------------------- | --------------------- | --------------------- | --------------------- |
| Field7 | date-only           | `2026-03-15`          | `2026-03-15`          | `2026-03-15`          |
| Field5 | date+time, ignoreTZ | `2026-03-15T00:00:00` | `2026-03-15T00:00:00` | `2026-03-15T00:00:00` |

V1 DateTime reload is self-consistent: the save path strips Z, and the reload path parses the Z-less string as local — reconstructing the original time. No cross-timezone shift on reload.

**Record saved from Mumbai, loaded in 3 timezones:**

| Field  | Configuration       | São Paulo Load        | Mumbai Load           | London Load           |
| ------ | ------------------- | --------------------- | --------------------- | --------------------- |
| Field7 | date-only           | `2026-03-14`          | `2026-03-14`          | `2026-03-14`          |
| Field5 | date+time, ignoreTZ | `2026-03-15T00:00:00` | `2026-03-15T00:00:00` | `2026-03-15T00:00:00` |

The date-only field shows `2026-03-14` everywhere — FORM-BUG-7 was baked in during the Mumbai save (user entered March 15, stored as March 14). The V1 reload path preserves this incorrect value consistently. The date+time field is correct in all timezones — V1's save/reload cycle is self-consistent for date+time fields even with Z-stripping.

### Corrections From Original Analysis

| Original Claim                            | Audit Finding                                                                  | Status          |
| ----------------------------------------- | ------------------------------------------------------------------------------ | --------------- |
| Mumbai date-only shift = -2 days          | Actual: -1 day                                                                 | **Corrected**   |
| Code path: V1 and V2                      | parseDateString is V2-only; V1 has equivalent inline code                      | **Corrected**   |
| Root enabler for FORM-BUG-7               | FORM-BUG-7 in V1 is independent (moment local-midnight parse, not Z-stripping) | **Corrected**   |
| ignoreTZ=false recovery "partially works" | Recovery works for date+time but **backfires for date-only at UTC-** (-1 day)  | **New Finding** |
| Affected scenarios: typed input           | Typed input goes through V1 normalizeCalValue, not parseDateString             | **Corrected**   |

---

## Technical Root Cause

### The Defective Function

**File**: `main.js` (bundled FormViewer application)
**Function**: `CalendarValueService.parseDateString()` — line ~104126

```javascript
parseDateString(input, enableTime, ignoreTimezone) {
    let result;
    let stripped = input.replace("Z", "");  // ← Unconditionally removes UTC marker

    if (ignoreTimezone) {
        result = moment(stripped);           // Parses as LOCAL time (wrong for UTC input)
    } else {
        result = moment(stripped).tz("UTC", true).local();  // Attempts recovery
    }

    if (!enableTime) {                      // Date-only fields
        result = result.startOf("day");     // Collapses to local midnight
    }

    return result.toISOString();
}
```

### Where This Function Is Called (V2 Only)

| Line   | Calling Function               | When                               |
| ------ | ------------------------------ | ---------------------------------- |
| 102798 | `normalizeCalValue()`          | SetFieldValue                      |
| 102935 | `initCalendarValueV2()`        | Form load — URL parameter          |
| 102939 | `initCalendarValueV2()`        | Form load — saved value            |
| 102948 | `initCalendarValueV2()`        | Form load — preset date            |
| 104133 | `formatDateStringForDisplay()` | Display formatting (also V2-gated) |

### V1 Equivalent Inline Code

| V1 Code Location    | What It Does                              | Same Effect As                           |
| ------------------- | ----------------------------------------- | ---------------------------------------- |
| Lines 102889/102893 | `value.replace("Z", "")` + `new Date(e)`  | parseDateString(input, true, true)       |
| Line 102893         | `new Date(this.data.value)` (preserves Z) | parseDateString(input, true, false)      |
| Line 102912         | T-truncation + `moment(e).toDate()`       | Different mechanism — this is FORM-BUG-7 |

---

## Workarounds

This bug is currently dormant because V2 is not active in standard form usage. The default V1 code path is the effective workaround.

For the V1 equivalent behaviors:

- **Date-only field shift in UTC+**: See [FORM-BUG-7 workarounds](bug-7-wrong-day-utc-plus.md)
- **DateTime Z-stripping on save**: See [FORM-BUG-4 workarounds](bug-4-legacy-save-format.md)
- **Current Date default** (`new Date()` directly) bypasses all string parsing — safe across all timezones
- **Server-side date computation** via REST API bypasses all client-side parsing

---

## Proposed Fix

### Before (Current)

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

### After (Fixed)

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

### Key Changes

1. **DateTime values**: Parse with `new Date()` which respects the Z suffix natively — no stripping needed
2. **Date-only values**: Extract the date portion and explicitly anchor to UTC midnight, ensuring the calendar date is preserved regardless of the user's timezone
3. **Removed**: The `ignoreTimezone` branching inside this function — the `ignoreTimezone` flag should affect display formatting, not how the value is parsed from storage

---

## Fix Impact Assessment

### What Changes If Fixed

- V2 form loads correctly preserve UTC dates regardless of user timezone
- V2 preset dates display the correct day for all users
- V2 URL parameter dates are interpreted correctly
- V1 is unaffected (requires separate fixes to inline code at lines 102889, 102893, 102907-102912)

### Backwards Compatibility Risk: HIGH

Existing saved data was stored with V1 behavior. V1's DateTime + ignoreTimezone save/reload cycle is self-consistent: Z is stripped on save (FORM-BUG-4), and the Z-less value is parsed correctly as local time on reload. Fixing `parseDateString` alone could break this self-consistency if V2 is enabled without a coordinated fix to the save path.

**Migration consideration**: Old data stored without Z needs to remain parseable as local time. If V2 is enabled globally, the save path (FORM-BUG-4 fix) and the load path (this fix) must be deployed together to maintain round-trip consistency.

### Regression Risk

- `parseDateString` is called on every V2 form load for every calendar field
- Fix must be tested across all 8 field configurations and multiple timezones
- Must verify that V1 inline code is also updated if this fix is deployed alongside V2 enablement
- The V1 code path must remain completely unaffected
