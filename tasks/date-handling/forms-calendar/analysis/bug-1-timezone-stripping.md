# Bug #1: Timezone Marker Stripping in parseDateString()

## Classification

| Field                  | Value                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Severity**           | Medium                                                                                                                                                                   |
| **Evidence**           | `[CODE]` + `[PLAYWRIGHT AUDIT 2026-04-06]` — Function behavior verified live across 3 TZs.                                                                               |
| **Component**          | FormViewer → CalendarValueService → `parseDateString()`                                                                                                                  |
| **Code Path**          | **V2 only** — parseDateString is never called under V1 (the default). V1 has equivalent inline Z-handling through different code. See [V1 vs V2 Scope](#v1-vs-v2-scope). |
| **Affected Configs**   | All (A–H) — function is config-agnostic                                                                                                                                  |
| **Affected TZs**       | All non-UTC timezones                                                                                                                                                    |
| **Affected Scenarios** | V2: SetFieldValue, form load (saved data, URL params, preset dates). V1: NOT directly affected — see V1 equivalent bugs below.                                           |
| **Related Bugs**       | Conceptual sibling of Bug #7 (both stem from local-time reinterpretation). NOT the root enabler of Bug #7 in V1.                                                         |

---

## Summary

The `parseDateString()` function unconditionally removes the `"Z"` suffix from ISO 8601 date strings before parsing. The `"Z"` indicates the value is in UTC. Without it, the same string is reinterpreted as **local time**, causing the stored value to silently shift by the user's timezone offset.

**Critical scope clarification**: `parseDateString()` is only called in the **V2 code path** (`useUpdatedCalendarValueLogic = true`). Under the default V1 path (which all production forms use), equivalent Z-handling occurs through inline code in `initCalendarValueV1()`, not through this function. The conceptual defect (treating UTC values as local time) exists in both paths, but through different code.

---

## Audit Status

**Playwright audit completed 2026-04-06** across BRT (UTC-3), IST (UTC+5:30), and UTC0. 19 tests per TZ, 5 phases.

- **Phase 1**: Direct parseDateString() invocation — 10 input combinations × 3 TZs ✅
- **Phase 2**: V1 call trace (monkey-patch) — 4 V1 operations ✅ (zero parseDateString calls)
- **Phase 3**: V1 inline equivalence — DateTime + DateOnly paths ✅
- **Phase 4**: V2 flag flip — parseDateString IS called under V2 ✅
- **Phase 5**: Cross-TZ saved record reload ✅

Spec file: `testing/date-handling/audit-bug1-tz-stripping.spec.js`

---

## Who Is Affected

- **V2 users** (Object View mode, or server flag enabled): all date operations route through parseDateString
- **V1 users** (default): NOT affected by parseDateString directly, but affected by equivalent inline code
- The shift is invisible to UTC-0 users (no offset to cause drift)
- UTC- users (e.g., BRT) get wrong internal UTC values but often correct display dates
- **UTC+ users** (e.g., IST) get visibly wrong dates when the shift crosses midnight

---

## V1 vs V2 Scope

### parseDateString call sites (main.js)

| Line   | Function                       | V1/V2   | When Called                                                  |
| ------ | ------------------------------ | ------- | ------------------------------------------------------------ |
| 102798 | `normalizeCalValue()`          | V2 only | SetFieldValue                                                |
| 102935 | `initCalendarValueV2()`        | V2 only | Form load — URL param                                        |
| 102939 | `initCalendarValueV2()`        | V2 only | Form load — saved value                                      |
| 102948 | `initCalendarValueV2()`        | V2 only | Form load — preset date                                      |
| 104133 | `formatDateStringForDisplay()` | V2 only | Display formatting (via `formatCalendarCell`, also V2-gated) |

**Verified by Playwright audit Phase 2**: Monkey-patched parseDateString logged zero calls during V1 operations (typed input, SetFieldValue, calendar popup).

### V1 equivalent inline code

| V1 Code (line)                                                    | Mechanism                                                         | Equivalent to                       |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------- |
| 102889/102893: `this.data.value.replace("Z", "")` + `new Date(e)` | Inline Z-strip for DateTime+ignoreTimezone                        | parseDateString(input, true, true)  |
| 102912: T-truncation + `moment(e).toDate()`                       | Strips T-and-everything-after, parses date-only as local midnight | Bug #7 — independent of Z-stripping |
| 102893: `new Date(this.data.value)` (ignoreTimezone=false)        | Preserves Z, correct parse                                        | parseDateString(input, true, false) |

**Verified by Playwright audit Phase 3**: V1 inline `replace("Z","") + new Date()` produces identical output to parseDateString(input, true, true) at both BRT and IST.

### Relationship to Bug #7

The original analysis stated Bug #1 is "the root enabler for Bug #7." **This is incorrect for V1.**

- Bug #7 in V1 is caused by `moment(dateOnlyString).toDate()` parsing date-only strings as local midnight
- In V1's date-only path, the T-truncation (`e.substring(0, e.indexOf("T"))`) removes the Z incidentally (it's after the T), but the actual defect is moment's local-midnight parsing
- Bug #1 (parseDateString Z-stripping) would only enable Bug #7 in V2, where parseDateString is called with the full ISO string including Z

---

## Root Cause

### The Defective Code

**File**: `main.js` (Angular production bundle)
**Function**: `CalendarValueService.parseDateString()` — line ~104126

```javascript
parseDateString(e, t, n) {  // e=input, t=enableTime, n=ignoreTimezone
    let r, a = e.replace("Z", "");  // ← BUG: Unconditionally removes UTC marker

    if (n) {                         // ignoreTimezone=true
        r = moment(a);               // Parses as LOCAL time (wrong)
    } else {                         // ignoreTimezone=false
        r = moment(a).tz("UTC", true).local();  // Recovery attempt
    }

    if (!t) {                        // enableTime=false (date-only)
        r = r.startOf("day");        // Collapses to local midnight
    }

    return r.toISOString();
}
```

### Why This Is Wrong

The `"Z"` in `"2026-03-15T00:00:00.000Z"` is the ISO 8601 timezone designator meaning "this time is UTC." Removing it changes the meaning:

```
WITH Z:      "2026-03-15T00:00:00.000Z"   → March 15, midnight UTC
WITHOUT Z:   "2026-03-15T00:00:00.000"    → March 15, midnight LOCAL
```

Note: This Z-stripping happens **client-side** in the FormViewer JavaScript before the value reaches the VV server. The server stores whatever string it receives as a SQL Server `datetime` value (timezone-unaware). The ambiguity is permanent — once Z is stripped, neither the database nor the reload path can determine whether the stored time represents UTC or a specific local timezone.

### What Should Happen

The function should **preserve the Z suffix** and parse the string as-is. For date-only fields, extract the date portion and anchor to UTC midnight:

```javascript
parseDateString(input, enableTime, ignoreTimezone) {
    if (enableTime) {
        return new Date(input).toISOString();
    } else {
        let dateStr = input.includes("T") ? input.substring(0, input.indexOf("T")) : input;
        if (dateStr.endsWith("Z")) dateStr = dateStr.replace("Z", "");
        return new Date(dateStr + "T00:00:00.000Z").toISOString();
    }
}
```

---

## Playwright-Verified Behavior (2026-04-06)

### parseDateString() output by TZ and flags

Input: `"2026-03-15T00:00:00.000Z"` (midnight UTC)

| enableTime | ignoreTZ | BRT (UTC-3)                                | IST (UTC+5:30)                          | UTC0                          | Correct                    |
| ---------- | -------- | ------------------------------------------ | --------------------------------------- | ----------------------------- | -------------------------- |
| true       | true     | `2026-03-15T03:00:00.000Z` (+3h)           | `2026-03-14T18:30:00.000Z` (-5.5h)      | `2026-03-15T00:00:00.000Z` ✅ | `2026-03-15T00:00:00.000Z` |
| true       | false    | `2026-03-15T00:00:00.000Z` ✅              | `2026-03-15T00:00:00.000Z` ✅           | `2026-03-15T00:00:00.000Z` ✅ | `2026-03-15T00:00:00.000Z` |
| false      | true     | `2026-03-15T03:00:00.000Z` (+3h, same day) | `2026-03-14T18:30:00.000Z` (**-1 day**) | `2026-03-15T00:00:00.000Z` ✅ | `2026-03-15T00:00:00.000Z` |
| false      | false    | `2026-03-14T03:00:00.000Z` (**-1 day!**)   | `2026-03-14T18:30:00.000Z` (**-1 day**) | `2026-03-15T00:00:00.000Z` ✅ | `2026-03-15T00:00:00.000Z` |

Input: `"2026-03-15T12:00:00.000Z"` (noon UTC)

| enableTime | ignoreTZ | BRT                                                     | IST                                            | UTC0                          |
| ---------- | -------- | ------------------------------------------------------- | ---------------------------------------------- | ----------------------------- |
| true       | true     | `2026-03-15T15:00:00.000Z` (+3h)                        | `2026-03-15T06:30:00.000Z` (-5.5h)             | `2026-03-15T12:00:00.000Z` ✅ |
| false      | true     | `2026-03-15T03:00:00.000Z` (+3h, collapsed to midnight) | `2026-03-14T18:30:00.000Z` (-1 day, collapsed) | `2026-03-15T00:00:00.000Z` ✅ |

Input: `"2026-03-15T00:00:00"` (no Z — already local)

| enableTime | ignoreTZ | BRT                                                       | IST                                                       | UTC0                          |
| ---------- | -------- | --------------------------------------------------------- | --------------------------------------------------------- | ----------------------------- |
| true       | true     | `2026-03-15T03:00:00.000Z` (correct — local BRT midnight) | `2026-03-14T18:30:00.000Z` (correct — local IST midnight) | `2026-03-15T00:00:00.000Z` ✅ |
| false      | true     | `2026-03-15T03:00:00.000Z` (+3h from UTC midnight)        | `2026-03-14T18:30:00.000Z` (-1 day from UTC midnight)     | `2026-03-15T00:00:00.000Z` ✅ |

Input: `"2026-03-15"` (date-only string)

| enableTime | ignoreTZ | BRT                                        | IST                                 | UTC0                          |
| ---------- | -------- | ------------------------------------------ | ----------------------------------- | ----------------------------- |
| false      | false    | `2026-03-14T03:00:00.000Z` (**-1 day!**)   | `2026-03-14T18:30:00.000Z` (-1 day) | `2026-03-15T00:00:00.000Z` ✅ |
| false      | true     | `2026-03-15T03:00:00.000Z` (+3h, same day) | `2026-03-14T18:30:00.000Z` (-1 day) | `2026-03-15T00:00:00.000Z` ✅ |

### Analysis corrections

| Original claim                            | Audit finding                                                                | Status          |
| ----------------------------------------- | ---------------------------------------------------------------------------- | --------------- |
| IST date-only shift = -2 days             | Actual: -1 day (`"2026-03-14T18:30:00.000Z"`)                                | **CORRECTED**   |
| Code Path: V1 and V2                      | parseDateString is V2-only. V1 has equivalent inline code.                   | **CORRECTED**   |
| Root enabler for Bug #7                   | Bug #7 in V1 is independent (moment local-midnight parse, not Z-stripping)   | **CORRECTED**   |
| ignoreTZ=false recovery "partially works" | Recovery works for DateTime but **backfires for date-only at BRT** (-1 day!) | **NEW FINDING** |
| Affected Scenarios: Typed Input           | Typed input goes through normalizeCalValue V1, not parseDateString           | **CORRECTED**   |

### Recovery branch analysis (ignoreTZ=false)

The `.tz("UTC", true).local()` recovery in the ignoreTZ=false branch:

- **DateTime (enableTime=true)**: Recovery works correctly — re-labels the local-parsed time as UTC, converts to local, produces correct `toISOString()` output. Verified 0h shift at BRT, IST, and UTC0.
- **Date-only (enableTime=false)**: Recovery **backfires at UTC- timezones**. The `.local()` conversion shifts midnight backward (e.g., -3h at BRT), crossing into the previous calendar day. Then `startOf("day")` snaps to that previous day's midnight. Result: -1 day error at both BRT and IST.

This means `ignoreTZ=false` is paradoxically **worse** than `ignoreTZ=true` for date-only fields at UTC- timezones:

- BRT + ignoreTZ=false + date-only: **-1 day** (recovery backfire)
- BRT + ignoreTZ=true + date-only: +3h (wrong time, but correct day)

---

## Impact Analysis

### Data Integrity

- Every date that passes through `parseDateString()` in V2 loses its UTC context
- The shift is silent — no error, no warning, no console log
- At UTC0, the bug is completely invisible

### V1 vs V2 Impact Comparison

| Scenario                  | V1 Impact                                | V2 Impact                                         |
| ------------------------- | ---------------------------------------- | ------------------------------------------------- |
| DateTime + ignoreTZ=true  | Inline Z-strip → same as parseDateString | parseDateString Z-strip → shifted                 |
| DateTime + ignoreTZ=false | No Z-strip → correct                     | parseDateString recovery → correct                |
| Date-only (all)           | T-truncation + moment local → Bug #7     | parseDateString Z-strip + startOf("day") → -1 day |
| SetFieldValue             | normalizeCalValue V1 path → Bug #7       | normalizeCalValue → parseDateString → shifted     |

### Interaction with ignoreTimezone Flag

- `ignoreTimezone=false` + `enableTime=true`: Recovery works correctly
- `ignoreTimezone=false` + `enableTime=false`: Recovery backfires (verified -1 day at BRT and IST)
- `ignoreTimezone=true` (all): No recovery — value is shifted by TZ offset

---

## Cross-TZ Saved Record Evidence (Phase 5)

### BRT-saved record (DateTest cat3-A-BRT) loaded in 3 TZs

| Field  | Config                | BRT Load                 | IST Load                 | UTC0 Load                |
| ------ | --------------------- | ------------------------ | ------------------------ | ------------------------ |
| Field7 | A (date-only)         | `2026-03-15` ✅          | `2026-03-15` ✅          | `2026-03-15` ✅          |
| Field5 | D (DateTime+ignoreTZ) | `2026-03-15T00:00:00` ✅ | `2026-03-15T00:00:00` ✅ | `2026-03-15T00:00:00` ✅ |

V1 DateTime reload is self-consistent: `getSaveValue()` strips Z on save → reload parses Z-less string as local → reconstructs original time. No cross-TZ shift on reload.

### IST-saved record (DateTest cat3-AD-IST) loaded in 3 TZs

| Field  | Config                | BRT Load                 | IST Load                 | UTC0 Load                |
| ------ | --------------------- | ------------------------ | ------------------------ | ------------------------ |
| Field7 | A (date-only)         | `2026-03-14`             | `2026-03-14`             | `2026-03-14`             |
| Field5 | D (DateTime+ignoreTZ) | `2026-03-15T00:00:00` ✅ | `2026-03-15T00:00:00` ✅ | `2026-03-15T00:00:00` ✅ |

Config A shows `2026-03-14` everywhere — Bug #7 was baked in during the IST save (user typed March 15, stored as March 14). The V1 reload path preserves this incorrect value consistently across TZs.

Config D (DateTime+ignoreTZ) is correct in all TZs — the V1 save/reload cycle is self-consistent for DateTime fields even with Z-stripping.

---

## Workarounds

No direct workaround available for this bug in V2. For V1, the equivalent defects have these mitigations:

- Bug #7 workarounds (use noon time strings for SetFieldValue)
- Using `"Current Date"` default (bypasses both parseDateString and V1 inline parsing)
- Server-side date computation via REST API (bypasses all client-side parsing)

---

## Fix Impact Assessment

### What Changes If Fixed

- V2: Saved dates reload correctly regardless of user timezone
- V2: Preset dates display the correct day for all users
- V2: URL parameter dates are interpreted correctly
- V1: Requires separate fixes to inline code at lines 102889, 102893, 102907-102912

### Backwards Compatibility Risk

- **HIGH**: Existing saved data was stored with the Bug #1/V1 inline behavior. V1 DateTime+ignoreTZ save/reload is self-consistent (Z stripped on save, Z-less value parsed correctly on reload). Fixing parseDateString alone could break this self-consistency if V2 is enabled without data migration.
- **Migration consideration**: Old data stored without Z needs to remain parseable as local time.

### Regression Risk

- parseDateString is called on every V2 form load for every calendar field
- Fix must be tested across all 8 configurations and multiple timezones
- Must verify that V1 inline code is also updated if parseDateString fix is deployed alongside V2 enablement
