# Calendar Field Date Handling — Complete Analysis

## Document Purpose

This document explains date handling defects in the VisualVault Forms calendar field component. It provides a comprehensive analysis of all identified bugs, the user scenarios they affect, live test evidence, workarounds, and recommended fixes.

**Scope**: Forms calendar fields only. Web Services and Dashboard analyses are maintained separately.

**Last updated**: 2026-04-06

---

## Changelog

| Date       | Change                                                                                                                                                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-06 | Major audit: corrected FORM-BUG-2 IST prediction (disproven), FORM-BUG-7 Date object claim (unverified), Scenario 6 bug list. Added Config Impact Matrix, Coverage Summary, Workarounds section, Legacy Appendix C. Added evidence tags throughout. |
| 2026-04-03 | Backfilled Cat 1 (20/20), Cat 2 (16/16) in Playwright test-data. Ran UTC0 regression.                                                                                                                                                               |
| 2026-04-02 | Completed Cat 12 edge cases (IST). Added FORM-BUG-5 year-boundary drift evidence.                                                                                                                                                                   |
| 2026-04-01 | Completed Cat 9 round-trip (PST, JST added). IST cross-TZ reload (DateTest-000084).                                                                                                                                                                 |
| 2026-03-31 | IST testing: disproved -2 day prediction for FORM-BUG-7 popup path. Both popup and typed = -1 day.                                                                                                                                                  |
| 2026-03-30 | Confirmed V1 active via CalendarValueService scan. Completed Cat 5, 6, 8B.                                                                                                                                                                          |
| 2026-03-27 | Initial analysis — 5 bugs from code review. FORM-BUG-5, #6, #7 confirmed live in BRT.                                                                                                                                                               |

---

## V1 vs V2 — Active Code Path

The form calendar has two init paths gated by `useUpdatedCalendarValueLogic` (a `CalendarValueService` flag, default `false`):

```javascript
useUpdatedCalendarValueLogic ? initCalendarValueV2() : initCalendarValueV1();
```

**All live test results reflect V1 behavior** (`useUpdatedCalendarValueLogic=false` in all tested fields). When reviewing init/load behavior for confirmed bugs, read `initCalendarValueV1` (~line 102886). Use V2 as reference for fix planning (it is the intended successor). The bugs in `parseDateString`, `getSaveValue`, `getCalendarFieldValue`, and `normalizeCalValue` are shared by both paths.

**Trigger points:** This conditional runs at `ngOnInit()` (line ~102744, component mount) and `checkMessage()` (line ~102787, on `relationshipObjectChanged`).

**When V2 activates** — three setter locations, all Object View context:

- Server flag: `setUserInfo()` reads `userInfo.useUpdatedCalendarValueLogic` from API response (line ~42218)
- `?ObjectID=` URL param present → `true` (line ~179699)
- Non-empty `modelId` on form load → `true` (line ~180554)

Standard standalone form (no ObjectID, no modelId, no server flag) → V1. All tests so far are V1.

**V2 fix scope is partial:** V2 routes date-only fields through `parseDateString()` which uses `.tz("UTC",true).local()`, fixing FORM-BUG-7 for `ignoreTimezone=false` fields. For `ignoreTimezone=true` date-only fields, V2 still uses `moment(stripped).toDate()` → **FORM-BUG-7 persists in V2 for those fields.**

**V1 FORM-BUG-7 scope includes form load:** `initCalendarValueV1` uses `moment(e).toDate()` for date-only strings in every branch — saved data, URL params, and preset initial values. UTC+ users get the wrong day on form load, not only via `SetFieldValue`.

---

## Executive Summary

### The Problem

Calendar fields may display or store incorrect dates. Seven bugs have been confirmed through code analysis and live browser testing across three timezones (BRT UTC-3, IST UTC+5:30, UTC+0), affecting 7 of 8 common scenarios.

### Business Impact

| Impact Area       | Description                                                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data Integrity    | Stored dates may differ from what users intended to enter                                                                                                                                                |
| Date Display      | UTC+ users may see the wrong calendar date (shifted by 1 day) on date-only fields                                                                                                                        |
| Developer Scripts | `GetFieldValue` on Config D adds fake `[Z]` causing progressive drift; `SetFieldValue` on date-only fields stores wrong day for UTC+ users                                                               |
| Reports & Queries | Database stores UTC for initial-value fields and local time for user-input fields — same logical date has different stored values; SQL date range queries across field types return inconsistent results |

### Bug Overview

| Bug # | Name                             | Severity | Evidence   | Root Cause                                                               | Status                                                                                                       |
| ----- | -------------------------------- | -------- | ---------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 1     | Timezone Marker Stripping        | Medium   | `[CODE]`   | `parseDateString()` removes "Z" suffix from UTC dates                    | Confirmed in code. Live impact absorbed into FORM-BUG-7 effects.                                             |
| 2     | Inconsistent User Input Handlers | Low      | `[LEGACY]` | Calendar popup and typed input use different save logic                  | NOT REPRODUCED for non-legacy configs (BRT, IST, UTC0). Legacy-only: popup vs typed store different formats. |
| 3     | Hardcoded Parameters             | Medium   | `[CODE]`   | `initCalendarValueV2()` ignores actual field settings                    | Confirmed in code (V2 only — V1 equivalent also hardcodes)                                                   |
| 4     | Legacy Save Format               | Medium   | `[CODE]`   | `getSaveValue()` removes "Z" suffix when saving                          | Confirmed in code and live tests                                                                             |
| 5     | Inconsistent Developer API       | **HIGH** | `[LIVE]`   | `GetFieldValue` adds fake literal `[Z]` causing round-trip drift         | **CONFIRMED live** — BRT, IST, UTC0. Drift = TZ offset per trip.                                             |
| 6     | Invalid Date for empty fields    | Medium   | `[LIVE]`   | `getCalendarFieldValue()` returns `"Invalid Date"` for empty Config D    | **CONFIRMED live**                                                                                           |
| 7     | Date-only wrong day in UTC+      | **HIGH** | `[LIVE]`   | `normalizeCalValue()` parses as local midnight → UTC date = previous day | **CONFIRMED live** — -1 day in IST for all string inputs. Date object -2 day `[UNVERIFIED]`.                 |

**Evidence tags**: `[LIVE]` = confirmed in browser testing. `[CODE]` = confirmed via source code analysis, not yet reproduced live. `[LEGACY]` = confirmed only for `useLegacy=true` configs. `[UNVERIFIED]` = predicted from code, never reproduced.

### Key Insight

Date-only fields (Configs A/B/E/F) work correctly **only for UTC- users**. FORM-BUG-7 means UTC+ users get the wrong day on every input path. The only scenario that avoids FORM-BUG-7 across all timezones is **"Current Date" default** (uses `new Date()` directly, bypassing string parsing) — but even that is affected by FORM-BUG-5 on Config D. Legacy configs (`useLegacy=true`) bypass FORM-BUG-5 but remain vulnerable to FORM-BUG-7.

---

## Quick Reference: Configuration Impact Matrix

Which bugs affect which field configuration. Based on live test results and code analysis.

| Config | enableTime | ignoreTZ | useLegacy | FORM-BUG-1 | FORM-BUG-2 | FORM-BUG-3 | FORM-BUG-4 | FORM-BUG-5 | FORM-BUG-6 | FORM-BUG-7 |
| :----: | :--------: | :------: | :-------: | :--------: | :--------: | :--------: | :--------: | :--------: | :--------: | :--------: |
|   A    |   false    |  false   |   false   |   `code`   |     --     |   `code`   |   `code`   |     --     |     --     |  **UTC+**  |
|   B    |   false    |   true   |   false   |   `code`   |     --     |   `code`   |   `code`   |     --     |     --     |  **UTC+**  |
|   C    |    true    |  false   |   false   |   `code`   |     --     |   `code`   |   `code`   |     --     |  `empty`   |     --     |
|   D    |    true    |   true   |   false   |   `code`   |     --     |   `code`   |   `code`   |  **YES**   |  `empty`   |     --     |
|   E    |   false    |  false   |   true    |   `code`   |  `legacy`  |   `code`   |   `code`   |     --     |     --     |  **UTC+**  |
|   F    |   false    |   true   |   true    |   `code`   |  `legacy`  |   `code`   |   `code`   |     --     |     --     |  **UTC+**  |
|   G    |    true    |  false   |   true    |   `code`   |  `legacy`  |   `code`   |   `code`   |     --     |     --     |     --     |
|   H    |    true    |   true   |   true    |   `code`   |  `legacy`  |   `code`   |   `code`   |     --     |     --     |     --     |

**Legend**: **YES** = confirmed live, all TZs. **UTC+** = confirmed live, only UTC+ timezones (IST tested; BRT unaffected). `code` = code-analysis confirmed, not independently reproduced. `legacy` = confirmed only for `useLegacy=true`. `empty` = triggers only when field is empty/cleared. `--` = not applicable.

**Key patterns**:

- **FORM-BUG-5**: Only Config D — requires `enableTime=true` + `ignoreTimezone=true` + `useLegacy=false`
- **FORM-BUG-6**: Only Configs C and D when field is empty — requires `enableTime=true` + `!useLegacy`. `null` input triggers same behavior as `""` (confirmed 2026-04-08). `useLegacy=true` confirmed safe — all legacy configs return `""` correctly (TC-8-H-empty).
- **FORM-BUG-7**: Only date-only configs (A/B/E/F, `enableTime=false`), only UTC+ timezones. BRT and UTC0 unaffected.
- **Legacy (E–H)**: Immune to FORM-BUG-5 (`useLegacy=true` bypasses fake Z). Still vulnerable to FORM-BUG-7 on date-only fields. See [Appendix C](#appendix-c-legacy-config-eh-characterization).

---

## Quick Reference: Test Coverage Summary

Source: [`../matrix.md`](../matrix.md) | Full evidence: [`../summaries/`](../summaries/) and [`../runs/`](../runs/)

| Category                  |  Total  |  PASS   |  FAIL  | PENDING | Status       |
| ------------------------- | :-----: | :-----: | :----: | :-----: | ------------ |
| 1. Calendar Popup         |   20    |    7    |   13   |    0    | **Complete** |
| 2. Typed Input            |   16    |   11    |   5    |    0    | **Complete** |
| 3. Server Reload          |   18    |   14    |   4    |    0    | **Complete** |
| 4. URL Parameters         |   39    |   39    |   0    |    0    | **Complete** |
| 5. Preset Date            |   18    |   11    |   7    |    0    | **Complete** |
| 6. Current Date           |   15    |   13    |   2    |    0    | **Complete** |
| 7. SetFieldValue formats  |   39    |   29    |   9    |    1    | 38/39 done   |
| 8. GetFieldValue return   |   19    |   12    |   6    |    1    | 18/19 done   |
| 8B. GetDateObject return  |   12    |   11    |   1    |    0    | **Complete** |
| 9. Round-Trip (GFV)       |   20    |    9    |   11   |    0    | **Complete** |
| 9-GDOC. Round-Trip (GDOC) |    5    |    2    |   0    |    3    | Partial      |
| 10. Web Service           |   11    |    4    |   5    |    1    | Partial      |
| 11. Cross-Timezone        |   14    |    0    |   0    |   13    | Pending      |
| 12. Edge Cases            |   20    |    5    |   9    |    5    | Partial      |
| 13. Database              |   10    |    2    |   0    |    8    | Pending      |
| **TOTAL**                 | **276** | **169** | **72** | **32**  |              |

**Executed**: 241 of 276 slots (87%). **Failure rate**: 72/241 = 30%.

**Fully complete** (all slots executed): Categories 1, 2, 3, 4, 5, 6, 8B, 9.

**Not yet tested**: Category 11 (requires OS-level TZ switching), Category 13 (requires direct SQL access).

**Timezones tested**: BRT (UTC-3), IST (UTC+5:30), UTC+0. Additional spot checks: PST/PDT (UTC-7), JST (UTC+9) in Category 9.

---

## Part 1: User Scenarios & Impact

This section describes each way a date can enter the system and which bugs affect it.

---

### Scenario 1: User Selects Date via Calendar Popup

**How it works**: User clicks the calendar icon and selects a date from the popup.

**Bugs**: #7 (date-only configs in UTC+), #5 (Config D — fake Z on read-back), #2 (legacy only — popup vs typed format difference)

**Live test results**: Category 1, 20/20 complete — **7 PASS, 13 FAIL**. FORM-BUG-7 is the primary failure in IST (configs A/B/E/F store previous day). FORM-BUG-5 causes fake Z on Config D GFV in all timezones. `[LIVE]`

**What happens**:

- The popup handler (`calChangeSetValue`) saves the date directly as an ISO string
- It bypasses the `getSaveValue()` function that other paths use
- For date-only fields in UTC+, `normalizeCalValue()` converts the Date object to local midnight → wrong UTC day (FORM-BUG-7)

**Impact**: UTC+ users selecting a date via popup on a date-only field get the previous day stored. DateTime fields (C/D/G/H) store the correct date but Config D suffers FORM-BUG-5 on read-back.

**Code path**:

```
kendo-calendar → calChangeSetValue() → updateFormValueSubject()
```

---

### Scenario 2: User Types Date in Input Field

**How it works**: User types a date directly in the input box (e.g., "1/15/2026").

**Bugs**: #1 (Timezone stripping), #7 (date-only configs in UTC+), #4 (Legacy save format)

**Live test results**: Category 2, 16/16 complete — **11 PASS, 5 FAIL**. Same FORM-BUG-7 pattern as Scenario 1. Typed and popup produce identical results for non-legacy configs — FORM-BUG-2 NOT reproduced. `[LIVE]`

**What happens**:

1. Input is parsed to a Date object
2. Converted to ISO string via `toISOString()`
3. Passed through `getSaveValue()` which strips the "Z" in legacy mode
4. For date-only fields in UTC+, `normalizeCalValue()` applies local-midnight shift (FORM-BUG-7)

**Impact**: Same as Scenario 1 for non-legacy configs. For legacy configs, the stored format differs from popup (FORM-BUG-2) but the date value has the same FORM-BUG-7 shift.

**Code path**:

```
kendo-datepicker → calChange() → getSaveValue() → updateFormValueSubject()
```

---

### Scenario 3: Form Loads with Previously Saved Data

**How it works**: User opens an existing form instance from the database.

**Bugs**: #1 (Timezone stripping), #3 (Hardcoded params — V2 only), #4 (Legacy save), #7 (date-only configs in UTC+ on V1 load path)

**Live test results**: Category 3, 18/18 complete — **14 PASS, 4 FAIL**. Cross-TZ reload tested: DateTest-000084 saved from IST, reloaded in BRT. Legacy configs E/F/H tested. `[LIVE]`

**What happens**:

1. Server returns the saved date value
2. V1: `initCalendarValueV1()` processes with `moment(e).toDate()` for date-only strings — FORM-BUG-7 on load path for UTC+ users `[CODE]`
3. V2: `initCalendarValueV2()` processes with **hardcoded** `enableTime=true` — FORM-BUG-3 `[CODE]`
4. `parseDateString()` strips the "Z" suffix — FORM-BUG-1

**Impact**: A date saved from BRT may display correctly when reloaded in BRT, but shift by 1 day when reloaded from a UTC+ timezone (FORM-BUG-7 on load path — code-confirmed, not independently live-tested for reload scenario).

**Code path**:

```
Server → initCalendarValueV1() → moment(e).toDate() [date-only]
       → initCalendarValueV2() [enableTime=true hardcoded] → parseDateString() [V2 only]
```

---

### Scenario 4: Form Opens via URL with Date Parameter

**How it works**: Form is opened with a date in the URL query string (e.g., `?birthDate=2026-01-15T00:00:00.000Z`).

**Bugs**: #1 (Timezone stripping), #4 (Legacy save)

**Live test results**: NOT YET TESTED — 5 slots PENDING. Requires `enableQListener=true` fields not available on current test form. `[PENDING]`

**What happens**:

1. URL parameter contains a UTC date with "Z" suffix
2. `parseDateString()` strips the "Z"
3. The UTC time is reinterpreted as local time
4. If the time + timezone offset crosses midnight, the date shifts

**Impact**: A URL parameter of `2026-01-15T00:00:00.000Z` (January 15 midnight UTC) may display as January 14 for users in positive UTC offsets (e.g., UTC+5:30).

**Example**:

| Original Value (UTC)   | User Timezone     | Result                                     |
| ---------------------- | ----------------- | ------------------------------------------ |
| `2026-01-15T00:00:00Z` | UTC-5 (New York)  | Jan 15 (correct display, wrong stored UTC) |
| `2026-01-15T00:00:00Z` | UTC+5:30 (Mumbai) | **Jan 14** (wrong date!)                   |
| `2026-01-15T15:00:00Z` | UTC+5:30 (Mumbai) | Jan 15 (correct display, wrong stored UTC) |

**Code path**:

```
URL → initCalendarValueV2() → parseDateString() → getSaveValue()
```

---

### Scenario 5: New Form with Preset Date Default

**How it works**: Form template is configured with a specific default date (e.g., "March 1, 2026").

**Bugs**: #1 (Timezone stripping), #3 (Hardcoded params — V2), #4 (Legacy save), #7 (date-only configs in UTC+), #5 (Config D only)

**Live test results**: Category 5, 18/18 complete — **11 PASS, 7 FAIL**. FORM-BUG-7 confirmed on all date-only presets in IST. FORM-BUG-5 on Config D presets (invisible at UTC0). Config C presets are TZ-independent. Legacy configs (E–H) safe from FORM-BUG-5. `[LIVE]`

**What happens**:

1. Form template provides the preset date
2. V1: processed via `moment(initialDate).toDate()` — FORM-BUG-7 for date-only fields in UTC+
3. V2: `initCalendarValueV2()` processes with **hardcoded** `enableTime=false` and `ignoreTimezone=true` — FORM-BUG-3
4. `parseDateString()` strips "Z" and parses as local time — FORM-BUG-1

**Impact**: A preset date of March 1 displays as February 28 for UTC+ users on date-only fields. Config D presets work correctly on display but read back with fake Z (FORM-BUG-5).

**Code path**:

```
Template → initCalendarValueV1() → moment(initialDate).toDate() [V1]
         → initCalendarValueV2() [enableTime=false, ignoreTimezone=true hardcoded] → parseDateString() [V2]
```

---

### Scenario 6: New Form with "Current Date" Default

**How it works**: Form template is configured to default to today's date.

**Bugs**: #5 (Config D only — fake Z on GFV read-back)

**Live test results**: Category 6, 15/15 complete — **13 PASS, 2 FAIL**. The 2 failures are FORM-BUG-5 on Config D (BRT and IST). All other configs pass, including all legacy configs. Cross-midnight edge case demonstrated in IST (current date at 11:30 PM IST → next UTC day stored for Config C). `[LIVE]`

**What happens**:

1. Code executes `new Date()` to get current date/time
2. Converts directly to ISO string via `toISOString()`
3. No string re-parsing occurs — **bypasses FORM-BUG-7** (no `moment(dateString).toDate()` call)
4. However, `GetFieldValue()` on Config D still applies fake `[Z]` — FORM-BUG-5

**Impact**: Current Date is the safest input scenario — the date is always correct at save time. But developers reading Config D values via `GetFieldValue()` still get the fake Z, causing drift if used in round-trips.

**Code path**:

```
Template → new Date() → toISOString() → getSaveValue()
```

**Workaround**: See [Part 3, item #2](#part-3-workarounds--developer-guidance) for safe read alternatives.

---

### Scenario 7: Developer Sets Date via VV.Form.SetFieldValue

**How it works**: Developer calls `VV.Form.SetFieldValue("dateField", value)` programmatically.

**Bugs**: #5 (Config D — on subsequent GFV read), #7 (date-only configs in UTC+)

**Live test results**: Category 7, 38/39 done — **29 PASS, 9 FAIL**. All 8 configs tested across BRT and IST. Key findings: `[LIVE]`

- **Config C is format-agnostic**: All 7 input formats (ISO+Z, ISO no-Z, US, date-only, Date object, epoch, ISO offset) produce identical correct results for local-midnight inputs
- **`useLegacy=true` bypasses FORM-BUG-5** on GFV read-back but does NOT protect date-only fields from FORM-BUG-7
- **All string formats produce -1 day** in IST for date-only configs (A/B/E/F)

**What happens**:

1. `SetFieldValue()` calls `SetFieldValueInternal()`
2. Value is passed to calendar component via message
3. `normalizeCalValue()` converts to Date object — FORM-BUG-7 applies here for date-only fields
4. Component triggers `calChange()` → `getSaveValue()` → stored value

**Impact**: Date-only fields store the previous day for UTC+ users regardless of input format. Config D values are stored correctly but read back with fake Z (FORM-BUG-5).

**Code path**:

```
VV.Form.SetFieldValue() → SetFieldValueInternal() → setValueObjectValueByName(rawValue)
                        → sendMessage({ value: rawValue })
                            → Calendar receives message
                            → normalizeCalValue() → calChange() → getSaveValue()
```

**Workaround**: See [Part 3, items #4 and #5](#part-3-workarounds--developer-guidance).

---

### Scenario 8: Developer Gets Date via VV.Form.GetFieldValue

**How it works**: Developer calls `VV.Form.GetFieldValue("dateField")` to retrieve the stored value.

**Bugs**: #5 (Config D — fake Z), #6 (Configs C/D — "Invalid Date" for empty fields)

**Live test results**: Category 8, 18/19 done — **12 PASS, 6 FAIL**. Category 8B (GetDateObject), 12/12 complete — **11 PASS, 1 FAIL** (8B-A-IST fails due to upstream FORM-BUG-7, not GDOC fault). `[LIVE]`

Key findings:

- FORM-BUG-5 on Config D confirmed in all TZs (BRT: -3h drift, IST: +5:30h drift, UTC0: 0h — coincidentally correct)
- FORM-BUG-6 on empty Config C and D (returns truthy `"Invalid Date"` string)
- **Legacy DateTime (G/H) returns raw value** (no UTC conversion) — safe from FORM-BUG-5
- **V2 code path bypasses all GFV transformations** (FORM-BUG-5 absent under V2) `[CODE]`
- **`GetDateObjectFromCalendar()` is a safe alternative**: returns correct Date object for all configs, `undefined` for empty (falsy, safe for conditionals)

**The `getCalendarFieldValue()` behavior**:

| Mode          | enableTime | ignoreTimezone | Return Format                       |
| ------------- | :--------: | :------------: | ----------------------------------- |
| Updated logic |    any     |      any       | Raw value unchanged                 |
| Legacy        |    true    |      true      | Adds `[Z]` suffix via format string |
| Legacy        |    true    |     false      | `new Date(value).toISOString()`     |
| Legacy        |   false    |      any       | Raw value                           |

**Code path**:

```
VV.Form.GetFieldValue() → getValueObjectValue() → getCalendarFieldValue()
```

**Workaround**: See [Part 3, items #1 and #2](#part-3-workarounds--developer-guidance).

---

### Scenario Summary Matrix

Based on live test evidence. Each cell indicates which bugs are **confirmed active** for that scenario.

| Scenario            | Bugs Confirmed Live                          | Tests | Pass Rate | Status                      |
| ------------------- | -------------------------------------------- | :---: | :-------: | --------------------------- |
| 1. Calendar Popup   | #7 `[LIVE]`, #5 `[LIVE]`                     | 20/20 |    35%    | Complete                    |
| 2. Typed Input      | #7 `[LIVE]`                                  | 16/16 |    69%    | Complete                    |
| 3. Saved Data       | #7 `[CODE]` on load path, #4 `[CODE]`        | 18/18 |    78%    | Complete                    |
| 4. URL Parameter    | #1 `[LIVE]`, #5 `[LIVE]`; #7 immune          | 39/39 |   100%    | Complete (2026-04-08)       |
| 5. Preset Date      | #7 `[LIVE]`, #5 `[LIVE]`                     | 18/18 |    61%    | Complete                    |
| 6. Current Date     | #5 `[LIVE]` (Config D only)                  | 15/15 |    87%    | Complete                    |
| 7. SetFieldValue    | #7 `[LIVE]`, #5 `[LIVE]`                     | 38/39 |    76%    | 1 pending                   |
| 8. GetFieldValue    | #5 `[LIVE]`, #6 `[LIVE]`                     | 30/31 |    77%    | Cat 8 + 8B combined, 2 pend |
| — Round-Trip (GFV)  | #5 `[LIVE]` (drift), #7 `[LIVE]` (date-only) | 20/20 |    45%    | Complete                    |
| — Round-Trip (GDOC) | (none triggered)                             |  2/5  |   100%    | 3 pending                   |

---

## Part 2: Bug Analysis

This section provides technical details for each bug.

---

### FORM-BUG-1: Timezone Marker Stripping in parseDateString()

**Evidence**: `[CODE]` — Confirmed in source code. Live impact is absorbed into FORM-BUG-7 effects; not independently observable in isolation.

**Root Cause**: The `parseDateString()` function unconditionally removes the "Z" suffix from ISO date strings.

**Location**: `parseDateString()` function

**Code**:

```javascript
parseDateString(input, enableTime, ignoreTimezone) {
    let result;
    let stripped = input.replace("Z", "");  // ← PROBLEM: Always removes "Z"

    if (ignoreTimezone) {
        result = moment(stripped);  // Parse as local time
    } else {
        result = moment(stripped).tz("UTC", true).local();  // Attempt recovery
    }

    if (!enableTime) {
        result = result.startOf("day");  // Additional problem for date-only
    }

    return result.toISOString();
}
```

**Why This Causes Problems**:

The "Z" in an ISO date string (`2026-01-15T00:00:00.000Z`) tells JavaScript "this is UTC time." Without it, the same string is interpreted as **local time** in the user's browser timezone.

```
Original:     "2026-01-15T00:00:00.000Z"   → JavaScript knows this is midnight UTC
After strip:  "2026-01-15T00:00:00.000"    → JavaScript assumes this is midnight LOCAL

User in UTC+5:30 (Mumbai):
  "Jan 15, 00:00 local" = "Jan 14, 18:30 UTC"
  → The date shifts backward by one day when stored
```

**Conditions for Date Shift**:

A visible date shift occurs when: `(original UTC time) + (user's timezone offset)` crosses a day boundary.

| Original Time (UTC) | User Timezone | Crosses Midnight?                | Date Shifts? |
| ------------------- | ------------- | -------------------------------- | ------------ |
| 00:00 (midnight)    | UTC+5:30      | Yes (becomes 18:30 previous day) | **Yes**      |
| 00:00 (midnight)    | UTC-5         | No (becomes 19:00 same day)      | No\*         |
| 15:00 (3 PM)        | UTC+5:30      | No (becomes 09:30 same day)      | No\*         |
| 02:00 (2 AM)        | UTC+5:30      | Yes (becomes 20:30 previous day) | **Yes**      |

\*Note: Even when the date doesn't visibly shift, the stored UTC value is still wrong.

**Affected Scenarios**: 2, 3, 4, 5

**Workaround**: See [Part 3, item #4](#workaround-4-bug-7-wrong-day-in-utc).

---

### FORM-BUG-2: Inconsistent User Input Handlers

**Evidence**: `[LEGACY]` — NOT REPRODUCED for non-legacy configs (`useLegacy=false`) in BRT, IST, or UTC0. Confirmed only for `useLegacy=true` configs where popup and typed paths produce different stored formats.

**Root Cause**: The calendar popup and direct input field use different handlers with different behavior.

**Location**: `calChangeSetValue()` vs `calChange()`

**Calendar Popup Handler** (`calChangeSetValue`):

```javascript
calChangeSetValue(e) {
    let t = e && !isNaN(e.getDate()) ? e.toISOString() : "";
    this.value = e,
    this.data.text = this.data.value = t,
    this.updateFormValueSubject(this.data.name, t),  // ← Saves directly, no getSaveValue()
    // ...
}
```

**Direct Input Handler** (`calChange`):

```javascript
calChange(e, t=!0, n=!1) {
    let i = e && !isNaN(e.getDate()) ? e.toISOString() : "";
    // ...
    this.data.text = this.data.value = i;
    let r = this.calendarValueService.getSaveValue(
        this.data.value,
        this.data.enableTime,
        this.data.ignoreTimezone
    );
    this.updateFormValueSubject(this.data.name, r, !0, t, n),  // ← Uses getSaveValue()
    // ...
}
```

**The Inconsistency**:

| Input Method   | Handler               | Uses `getSaveValue()`? | Stored Format                  |
| -------------- | --------------------- | :--------------------: | ------------------------------ |
| Calendar popup | `calChangeSetValue()` |           No           | `2026-01-15T05:00:00.000Z`     |
| Direct input   | `calChange()`         |          Yes           | `2026-01-15T05:00:00` (no "Z") |

**Live Test Status**:

- **Non-legacy configs (A–D)**: NOT REPRODUCED. Tests 1-A-IST and 2-A-IST both store `"2026-03-14"` — same value. Tests 1-A-BRT and 2-A-BRT both store `"2026-03-15"` — same value. The `normalizeCalValue()` step in the popup path eliminates the format difference before reaching storage. `[LIVE — disproven for non-legacy]`
- **Legacy configs (E–H)**: Popup stores raw `toISOString()` (e.g., `"2026-03-15T03:00:00.000Z"` with Z suffix and full UTC time). Typed stores `getSaveValue()` output (e.g., `"2026-03-15T00:00:00"` without Z, local time). Different formats for the same intended date. `[LIVE — confirmed for legacy]`

**Affected Scenarios**: 1, 2 (legacy configs only)

---

### FORM-BUG-3: Hardcoded Parameters in initCalendarValueV2()

**Evidence**: `[CODE]` — Confirmed in source code. V2-only code path; V1 equivalent also hardcodes. No live test coverage (V2 never activated in testing).

**Root Cause**: The `initCalendarValueV2()` function ignores actual field settings for certain data sources.

**Location**: `initCalendarValueV2()` function

**Code**:

```javascript
initCalendarValueV2() {
    let isNewValue = false;

    if (this.data.enableQListener && this.data.text) {
        // URL Query String - uses actual field settings ✓
        this.data.value = this.calendarValueService.parseDateString(
            this.data.text,
            this.data.enableTime,      // ← Uses actual setting
            this.data.ignoreTimezone   // ← Uses actual setting
        );
        // ...
    } else if (this.data.value) {
        // Server/Database - HARDCODED ✗
        this.data.value = this.calendarValueService.parseDateString(
            this.data.value,
            true,                      // ← HARDCODED enableTime=true
            this.data.ignoreTimezone
        );
        // ...
    } else if (this.data.enableInitialValue && this.docInfo.isFormTemplate) {
        switch (this.data.initialValueMode) {
            case CalendarInitialValueMode.CurrentDate:
                // Current Date - works correctly ✓
                this.value = new Date();
                break;
            case CalendarInitialValueMode.PresetDate:
                // Preset Date - HARDCODED ✗
                this.data.value = this.calendarValueService.parseDateString(
                    this.data.initialDate,
                    false,             // ← HARDCODED enableTime=false
                    true               // ← HARDCODED ignoreTimezone=true
                );
                break;
        }
    }
    // ...
}
```

**The Problem**:

| Data Source      |     `enableTime`      |   `ignoreTimezone`   | Issue                  |
| ---------------- | :-------------------: | :------------------: | ---------------------- |
| URL Query String |     Field setting     |    Field setting     | ✓ Correct              |
| Server/Database  | **true** (hardcoded)  |    Field setting     | ✗ Ignores field type   |
| Preset Date      | **false** (hardcoded) | **true** (hardcoded) | ✗ Ignores all settings |
| Current Date     |          N/A          |         N/A          | ✓ Correct              |

**Impact**:

- A date-only field loading saved data is processed as if it were a DateTime field
- A preset date ignores all field configuration

**Affected Scenarios**: 3, 5

---

### FORM-BUG-4: Legacy Save Format Strips Timezone

**Evidence**: `[CODE]` — Confirmed in source code and observable in live test stored values.

**Root Cause**: The `getSaveValue()` function removes the "Z" suffix when formatting DateTime values in legacy mode.

**Location**: `getSaveValue()` function

**Code**:

```javascript
getSaveValue(input, enableTime, ignoreTimezone) {
    let result = typeof input === "string" ? input : input.toISOString();

    if (this.useUpdatedCalendarValueLogic) {
        // Updated logic - handles timezone correctly
        result = ignoreTimezone
            ? moment(input).tz("UTC", true).toISOString()
            : moment(input).toISOString();
    } else if (input.length > 0) {
        // Legacy logic - STRIPS "Z"
        if (enableTime) {
            const format = "YYYY-MM-DD[T]HH:mm:ss";
            result = moment(input).format(format);  // ← No "Z" suffix!
        } else {
            if (input.indexOf("T") > 0) {
                result = input.substring(0, input.indexOf("T"));  // Date only
            }
        }
    }

    return result;
}
```

**The Problem**:

In legacy mode (which is the default), DateTime values are saved without the "Z" suffix:

| Mode               | Input                      | Output                     |
| ------------------ | -------------------------- | -------------------------- |
| Legacy (DateTime)  | `2026-01-15T05:00:00.000Z` | `2026-01-15T05:00:00`      |
| Legacy (Date-only) | `2026-01-15T05:00:00.000Z` | `2026-01-15`               |
| Updated            | `2026-01-15T05:00:00.000Z` | `2026-01-15T05:00:00.000Z` |

**Impact**: When this value is later reloaded, `parseDateString()` (FORM-BUG-1) can't strip "Z" because it's already gone—but the value is still ambiguous and will be interpreted as local time.

**Affected Scenarios**: 2, 3, 4, 5

---

### FORM-BUG-5: Inconsistent Developer API Behavior

**Evidence**: `[LIVE]` — Confirmed in BRT (UTC-3), IST (UTC+5:30), and UTC+0. Drift proportional to TZ offset per round-trip. Also affects Scenarios 5 and 6 (Config D preset and current date read-back).

**Severity**: **HIGH** — progressive data corruption on every `SetFieldValue(GetFieldValue())` round-trip.

**Root Cause**: `getCalendarFieldValue()` adds a literal `[Z]` to the moment format string for Config D (`enableTime=true`, `ignoreTimezone=true`, `!useLegacy`). This `[Z]` is a literal character, not a timezone indicator — but `SetFieldValue` interprets it as UTC.

**Location**: `getCalendarFieldValue()` — line ~104114

**GetFieldValue behavior** (via `getCalendarFieldValue`):

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;  // Raw value — V2 bypasses this entirely

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        if (fieldDef.ignoreTimezone) {
            return moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]");  // Adds [Z]
        }
        return new Date(value).toISOString();  // Standard ISO
    }

    return value;  // Legacy or date-only: raw value
}
```

**Drift calculation per round-trip**:

| Timezone        | Offset   | Drift per trip | Trips to full day shift |
| --------------- | -------- | -------------- | ----------------------- |
| BRT (São Paulo) | UTC-3    | -3 hours       | 8 trips                 |
| IST (Mumbai)    | UTC+5:30 | +5:30 hours    | ~4.4 trips              |
| PST/PDT         | UTC-7    | -7 hours       | ~3.4 trips              |
| JST (Tokyo)     | UTC+9    | +9 hours       | ~2.7 trips              |
| UTC+0 (London)  | UTC+0    | 0 hours        | ∞ (coincidentally safe) |

**Year boundary edge case**: In BRT, `SetFieldValue("2026-01-01T00:00:00")` → `GetFieldValue()` returns `"2025-12-31T21:00:00.000Z"` — crosses into previous year in a single trip. `[LIVE]`

**Affected Scenarios**: 5, 6, 7, 8 (all Config D paths)

**Only affects**: `enableTime=true` + `ignoreTimezone=true` + `useLegacy=false` (Config D)

**Workaround**: See [Part 3, items #1 and #2](#workaround-1-bug-5-use-uselegacytrue-or-gdoc).

**Multi-user compound drift (confirmed 2026-04-08)**: When users in different TZs each do a GFV round-trip on the same record, drift accumulates: IST user (+5:30h) → BRT user (-3h) = net +2:30h from original midnight. Production scenario for multi-TZ organizations. See TC-11-roundtrip-cross, TC-11-D-concurrent-IST-edit.

**DST spring-forward anomaly (confirmed 2026-04-08)**: On US DST transition day (Mar 8), V8 advances non-existent 2AM→3AM PDT. Fake Z `"T03:00:00.000Z"` lands in pre-DST window (UTC 03:00 < DST start at UTC 10:00) → resolves as PST Mar 7 19:00 (-8h, not PDT -7h). Crosses both day and DST boundary. See TC-12-dst-US-PST.

---

### FORM-BUG-6: GetFieldValue Returns `"Invalid Date"` for Empty Config C/D Fields

**Evidence**: `[LIVE]` — Confirmed for Config D (empty field). Also affects Config C (both have `enableTime=true` + `!useLegacy`).

**Root Cause**: `getCalendarFieldValue()` calls `moment(value).format(...)` when `value=""`. `moment("")` is an invalid moment, and `.format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")` returns the string `"Invalid Date"`.

**Location**: `getCalendarFieldValue()` — line ~104114

**Conditions**: `enableTime=true && !useLegacy && value=""`

**Impact**: `GetFieldValue()` returns `"Invalid Date"` (a truthy non-empty string) instead of `""` or `null`. Any developer check `if (VV.Form.GetFieldValue('field'))` incorrectly evaluates to `true` for an empty field.

**Scope fully mapped (2026-04-08)**: Config C **throws RangeError** (`new Date("").toISOString()` → Invalid Date → `.toISOString()` throws). Config D returns **truthy string** `"Invalid Date"` (`moment("").format()` → "Invalid Date"). `null` input via SFV triggers same behavior as `""` (TC-12-null-input). Config A returns `""` correctly (TC-12-empty-Config-A — `enableTime=false` skips the buggy branch). `useLegacy=true` **confirmed safe** (TC-8-H-empty returns `""`).

**Affected Scenarios**: 8 (GetFieldValue), 12 (Edge Cases — null/empty scope tests)

**Workaround**: See [Part 3, item #3](#workaround-3-bug-6-invalid-date-guard).

---

### FORM-BUG-7: Date-Only Fields Store Wrong Day for UTC+ Timezones

**Evidence**: `[LIVE]` — Confirmed in IST (UTC+5:30) across multiple categories. All string-based inputs produce **-1 day**. Date object double-shift to -2 days is `[UNVERIFIED]` — predicted from code analysis but never reproduced in live testing.

**Severity**: **HIGH** — affects ALL UTC+ users on ALL date-only fields, on every input path.

**Root Cause**: `normalizeCalValue()` uses `moment(input).toDate()` to parse date-only strings. Moment parses date-only strings as **local midnight** (not UTC midnight, unlike native `new Date('YYYY-MM-DD')`). For UTC+ users, local midnight = previous UTC day. `calChange()` then calls `toISOString()` which gives the previous UTC day, and `getSaveValue()` strips to that date.

**Location**: `normalizeCalValue()` — line ~102793

**Conditions**: `enableTime=false` (date-only fields — Configs A, B, E, F) + UTC+ timezone user

**Live test evidence**:

| Input Format                        | BRT (UTC-3) stores | IST (UTC+5:30) stores | Days off | Evidence       |
| ----------------------------------- | ------------------ | --------------------- | -------- | -------------- |
| `"2026-03-15"` (ISO date)           | `"2026-03-15"` ✓   | `"2026-03-14"` ✗      | -1       | `[LIVE]`       |
| `"03/15/2026"` (US format)          | `"2026-03-15"` ✓   | `"2026-03-14"` ✗      | -1       | `[LIVE]`       |
| `"2026-03-15T00:00:00"` (ISO+time)  | `"2026-03-15"` ✓   | `"2026-03-14"` ✗      | -1       | `[LIVE]`       |
| `"2026-03-15T00:00:00.000Z"` (UTC)  | `"2026-03-15"` ✓   | `"2026-03-14"` ✗      | -1       | `[LIVE]`       |
| `new Date(2026,2,15)` (Date object) | `"2026-03-15"` ✓   | predicted -2 days     | -2?      | `[UNVERIFIED]` |

**Note on Date object double-shift**: Code analysis predicts that `Date` objects undergo two local-midnight conversions in `normalizeCalValue()` (first `toISOString()`, then strip-and-reparse), producing -2 days in IST. This was **never reproduced in live testing** — all live test paths (popup, typed, SetFieldValue with strings) showed -1 day consistently. The -2 day path may only trigger when a `Date` object is directly passed to `SetFieldValue`, which was not tested in isolation.

**V1 load path — cross-TZ reload does NOT corrupt (confirmed 2026-04-08)**: Despite `initCalendarValueV1` using `moment(e).toDate()` in the code path, **cross-TZ form load preserves raw date-only values unchanged**. BRT-saved `"2026-03-15"` loaded in IST retains `"2026-03-15"` (TC-11-A-save-BRT-load-IST PASS). Also confirmed for Configs B (TC-11-B) and E/legacy (TC-11-E). The server returns the stored string as-is, and the form load path stores it without re-parsing through the buggy moment path. **FORM-BUG-7 fires at INPUT/SAVE time** (SFV, typed input, preset init), not at load time. This corrects the earlier `[CODE]` prediction.

**Round-trip compounding**: In Category 9, FORM-BUG-7 causes -1 day per round-trip on date-only fields in UTC+ (9-B-IST). After 3 round-trips, a date shifts by 3 days. `[LIVE]`

**GDOC round-trip double-shift (confirmed 2026-04-08)**: `GetDateObjectFromCalendar(field).toISOString()` → `SetFieldValue()` triggers a **compound -3 day shift** for date-only fields in IST. Mechanism: (1) initial SFV stores "2026-03-14" (-1 day, BUG-7), (2) GDOC ISO = "2026-03-13T18:30:00.000Z" (correct UTC for Mar 14 IST midnight), (3) SFV strips to "2026-03-13" (UTC date portion) → BUG-7 again → stores "2026-03-12". GDOC itself returns a correct Date object — the failure is in SFV's handling of the ISO Z string for date-only fields. BRT is immune (UTC- midnight = same UTC day). **GDOC round-trip is UNSAFE for date-only fields in UTC+.** See TC-9-GDOC-A-IST-1.

**Affected Scenarios**: 1, 2, 5, 7, 9, 9-GDOC (all user-input and API paths for date-only fields)

**Affected Configs**: A, B, E, F (`enableTime=false`)

**Workaround**: See [Part 3, items #4 and #5](#workaround-4-bug-7-wrong-day-in-utc).

---

### Database Mixed Timezone Storage (Structural Finding)

**Evidence**: `[LIVE]` — Confirmed via direct SQL query (TC-2.10 — 2026-03-30, BRT).

Not a discrete code bug — a consequence of two separate storage code paths writing to the same table with no timezone metadata.

**Finding:** Calendar field values in the same form record are stored in different timezone contexts depending on how the field is populated:

| Field type                               | Config                                          | JS value sent to server | SQL datetime stored             | Timezone semantics                                                    |
| ---------------------------------------- | ----------------------------------------------- | ----------------------- | ------------------------------- | --------------------------------------------------------------------- |
| Initial value — CurrentDate              | `enableInitialValue=true`, `initialValueMode=0` | `toISOString()` (UTC)   | e.g., `2026-04-06 15:53:43.000` | **UTC** — captured via `new Date().toISOString()` at save time        |
| Initial value — Preset                   | `enableInitialValue=true`, `initialValueMode=1` | `toISOString()` (UTC)   | e.g., `2026-03-01 03:00:00.000` | **UTC** — preset local midnight converted to UTC via `toISOString()`  |
| User input (popup, typed, SetFieldValue) | `enableInitialValue=false`, any config          | `getSaveValue()` (no Z) | e.g., `2026-03-15 00:00:00.000` | **Local time (ambiguous)** — `getSaveValue()` strips Z before sending |

**Observed DB values (confirmed via SQL Server dump 2026-04-06):**

All calendar fields are SQL Server `datetime` type (no `date`-only type). Values shown in SSMS `YYYY-MM-DD HH:MM:SS.mmm` format. The `M/d/yyyy h:mm:ss tt` format seen in VV Query Admin is .NET display formatting, not the stored value.

| Record               | Field                 | SQL datetime value        | Interpretation                                         |
| -------------------- | --------------------- | ------------------------- | ------------------------------------------------------ |
| cat3-A-BRT (000080)  | Field7 (Config A)     | `2026-03-15 00:00:00.000` | Local BRT midnight, stored as midnight (no TZ)         |
| cat3-A-BRT (000080)  | Field5 (Config D)     | `2026-03-15 00:00:00.000` | Local BRT midnight, stored as midnight (no TZ)         |
| cat3-AD-IST (000084) | Field7 (Config A)     | `2026-03-14 00:00:00.000` | **FORM-BUG-7: IST user entered Mar 15, stored Mar 14** |
| cat3-AD-IST (000084) | Field5 (Config D)     | `2026-03-15 00:00:00.000` | DateTime field correct (FORM-BUG-7 doesn't affect)     |
| BRT records          | Field2 (Preset Mar 1) | `2026-03-01 03:00:00.000` | UTC of BRT midnight (`toISOString()` path)             |
| IST records          | Field2 (Preset Mar 1) | `2026-02-28 18:30:00.000` | **FORM-BUG-7: IST midnight = prev UTC day**            |
| BRT records          | Field1 (CurrentDate)  | `2026-04-06 15:53:43.000` | UTC (`toISOString()` path)                             |

**VV server timezone**: Confirmed BRT (UTC-3). `VVCreateDate` stores server-local time; field values from `toISOString()` store UTC (3h ahead of `VVCreateDate`).

**Consequence for queries and reports:** The `datetime` column is timezone-unaware — no suffix, column, or metadata indicates whether `2026-03-15 00:00:00.000` is UTC or BRT. Reports or scheduled scripts that compare dates across field types, or that filter `WHERE FieldX BETWEEN @start AND @end`, will silently return wrong results when mixing `toISOString()` fields (UTC) with `getSaveValue()` fields (local). Preset Field2 (`2026-03-01 03:00:00.000` = UTC) and user-input Field7 (`2026-03-15 00:00:00.000` = local midnight) represent the same kind of value stored in incompatible timezone semantics.

**Root cause (code path):**

- Initial value path: `new Date()` or preset → `toISOString()` → `getSaveValue()` strips Z → result is UTC time without suffix
- User input path: `normalizeCalValue()` → `calChange()` → `getSaveValue()` strips Z from local-time ISO string → result is local time without suffix

Both paths call `getSaveValue()` which strips the Z, but the upstream time representation differs: UTC object vs local-time ISO string.

**Evidence:** `tasks/date-handling/forms-calendar/test-cases/tc-2-10-db-storage-mixed-tz-brt.md`

---

## Part 3: Workarounds & Developer Guidance

Actionable workarounds available today within the Forms calendar field scope. These do not require platform changes.

---

### Workaround #1: FORM-BUG-5 — Use `useLegacy=true` or GDOC

**Problem**: `GetFieldValue()` on Config D adds fake `[Z]`, causing progressive drift on round-trips.

**Solution**: Either:

- (a) Set `useLegacy=true` on the field definition. Legacy GFV returns raw value without fake Z transformation.
- (b) Use `GetDateObjectFromCalendar()` instead of `GetFieldValue()` — see Workaround #2.

**Caveat**: `useLegacy=true` changes popup behavior (stores raw `toISOString()` instead of `getSaveValue()` format) and does NOT protect date-only fields from FORM-BUG-7. See [Appendix C](#appendix-c-legacy-config-eh-characterization).

---

### Workaround #2: FORM-BUG-5/#6 — Use GetDateObjectFromCalendar()

**Problem**: `GetFieldValue()` on Configs C/D returns fake Z (FORM-BUG-5) or `"Invalid Date"` for empty fields (FORM-BUG-6).

**Solution**: Use `VV.Form.GetDateObjectFromCalendar('fieldName')` instead. It returns:

- A correct `Date` object for populated fields (no fake Z, no format transformation)
- `undefined` for empty fields (falsy — safe for `if` checks)

**Evidence**: Category 8B, 12 tests — 11 PASS, 1 FAIL (the failure is FORM-BUG-7 upstream, not GDOC fault). `[LIVE]`

**Caveat**: Returns a `Date` object, not a string. If you need a string, use `.toISOString()` for UTC or format manually for local.

---

### Workaround #3: FORM-BUG-6 — Invalid Date Guard

**Problem**: `GetFieldValue()` returns truthy `"Invalid Date"` string for empty Config C/D fields.

**Solution**: Guard your conditionals:

```javascript
const val = VV.Form.GetFieldValue('Field5');
if (val && val !== 'Invalid Date') {
    // Field has a real value
}
```

Or use `GetDateObjectFromCalendar()` (Workaround #2) which returns `undefined` for empty fields.

---

### Workaround #4: FORM-BUG-7 — Wrong Day in UTC+

**Problem**: All date-only fields store the previous day for UTC+ users via any input path.

**Solution**: For `SetFieldValue` calls, use an ISO string with explicit noon time to avoid the midnight boundary:

```javascript
// UNSAFE — stores previous day in UTC+
VV.Form.SetFieldValue('dateField', '2026-03-15');

// SAFER — noon avoids midnight boundary shift
VV.Form.SetFieldValue('dateField', '2026-03-15T12:00:00');
```

**Caveat**: This only works for DateTime fields (`enableTime=true`). For date-only fields (`enableTime=false`), `getSaveValue()` strips the time portion after `normalizeCalValue()` has already applied the local-midnight shift — so the noon trick may not survive the full pipeline. **Test in your specific config before relying on this.**

**Alternative**: Compute the correct date server-side via the REST API, which bypasses `normalizeCalValue()` entirely.

---

### Workaround #5: SetFieldValue Best Practices

**Problem**: Different input types produce different results in `normalizeCalValue()`.

**Recommendations**:

1. **Always use string inputs**, never `new Date()` objects — avoids the potential double-shift in `normalizeCalValue()`
2. **For date-only fields**: Use `"YYYY-MM-DD"` format (e.g., `"2026-03-15"`)
3. **For DateTime fields**: Use `"YYYY-MM-DDTHH:mm:ss"` format without Z (e.g., `"2026-03-15T14:30:00"`)
4. **Never use `new Date().toLocaleDateString()`** with non-US locales — may produce DD/MM/YYYY which the platform misinterprets
5. **Config C is format-agnostic** for local-midnight inputs — all 7 tested formats produce identical results `[LIVE]`

---

### Workaround #6: Round-Trip Safety

**Problem**: `SetFieldValue(GetFieldValue())` on Config D drifts by TZ offset per trip. On date-only fields in UTC+, each round-trip loses 1 day (FORM-BUG-7).

**Solution**: Never do `SetFieldValue(GetFieldValue('field'), 'field')` on Config D. Instead:

```javascript
// UNSAFE — progressive drift on Config D
const val = VV.Form.GetFieldValue('Field5');
VV.Form.SetFieldValue('Field5', val);

// SAFE — read via GDOC, no fake Z
const dateObj = VV.Form.GetDateObjectFromCalendar('Field5');
if (dateObj) {
    VV.Form.SetFieldValue('Field5', dateObj.toISOString());
}
```

For date-only fields in UTC+, round-trips are unsafe regardless of read method (FORM-BUG-7 applies on every write).

---

## Part 4: Recommended Solutions

These are proposed code fixes for the VisualVault engineering team. Each addresses a specific bug's root cause.

### Solution for FORM-BUG-1 (Timezone Stripping)

**Principle**: Never remove timezone information during parsing.

```javascript
parseDateString(input, enableTime, ignoreTimezone) {
    // NEVER strip the "Z" - it indicates UTC timezone

    if (enableTime) {
        // DateTime: parse as-is, preserving timezone
        return new Date(input).toISOString();
    } else {
        // Date-only: extract date portion, force UTC midnight
        let dateStr = input;
        if (dateStr.includes("T")) {
            dateStr = dateStr.substring(0, dateStr.indexOf("T"));
        }
        // Append UTC midnight to ensure consistent interpretation
        return new Date(dateStr + "T00:00:00.000Z").toISOString();
    }

    // ignoreTimezone should affect DISPLAY only, not parsing/storage
}
```

---

### Solution for FORM-BUG-2 (Inconsistent Handlers)

**Principle**: Both handlers should use the same transformation logic.

```javascript
calChangeSetValue(e) {
    let t = e && !isNaN(e.getDate()) ? e.toISOString() : "";
    this.value = e;
    this.data.text = this.data.value = t;

    // ADD: Use getSaveValue() for consistency
    let saveValue = this.calendarValueService.getSaveValue(
        this.data.value,
        this.data.enableTime,
        this.data.ignoreTimezone
    );

    this.updateFormValueSubject(this.data.name, saveValue);
    // ...
}
```

---

### Solution for FORM-BUG-3 (Hardcoded Parameters)

**Principle**: Use actual field settings from `this.data`.

```javascript
// Server/Database path - use actual settings
this.data.value = this.calendarValueService.parseDateString(
    this.data.value,
    this.data.enableTime, // ← Use actual setting
    this.data.ignoreTimezone
);

// Preset Date path - use actual settings
this.data.value = this.calendarValueService.parseDateString(
    this.data.initialDate,
    this.data.enableTime, // ← Use actual setting
    this.data.ignoreTimezone // ← Use actual setting
);
```

---

### Solution for FORM-BUG-4 (Legacy Save Format)

**Principle**: Always include "Z" suffix for DateTime values.

```javascript
getSaveValue(input, enableTime, ignoreTimezone) {
    let result = typeof input === "string" ? input : input.toISOString();

    if (input.length > 0) {
        if (enableTime) {
            // Always preserve timezone information
            result = moment(input).toISOString();  // Includes "Z"
        } else {
            if (input.indexOf("T") > 0) {
                result = input.substring(0, input.indexOf("T"));
            }
        }
    }

    return result;
}
```

---

### Solution for FORM-BUG-5 (Inconsistent Developer API)

**Principle**: Normalize input on Set, return consistent format on Get.

**SetFieldValue fix** - Normalize date values before storing:

```javascript
SetFieldValueInternal(fieldName, value) {
    const fieldDef = this.VV.FormPartition.filterFieldArray("name", fieldName)[0];

    // For Calendar fields, normalize the date value
    if (fieldDef && fieldDef.fieldType === FieldType.Calendar) {
        if (value instanceof Date) {
            value = value.toISOString();
        } else if (typeof value === "string" && value.length > 0) {
            // Normalize string to ISO format
            value = new Date(value).toISOString();
        }
    }

    // ... rest of implementation
}
```

**GetFieldValue fix** - Return consistent ISO format:

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (!value || value.length === 0) {
        return "";  // ← Fixes FORM-BUG-6 too
    }

    if (fieldDef.enableTime) {
        // DateTime: always return full ISO string with Z
        return new Date(value).toISOString();
    } else {
        // Date-only: return just the date portion
        const dateStr = value.includes("T")
            ? value.substring(0, value.indexOf("T"))
            : value;
        return dateStr;
    }

    // ignoreTimezone should affect DISPLAY formatting only,
    // not the value returned to developers
}
```

---

### Solution for FORM-BUG-6 (Invalid Date for Empty Fields)

**Principle**: Guard against empty/invalid input before formatting.

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;

    // ADD: Guard against empty values
    if (!value || value.length === 0) {
        return "";
    }

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        if (fieldDef.ignoreTimezone) {
            return moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]");
        }
        return new Date(value).toISOString();
    }

    return value;
}
```

---

### Solution for FORM-BUG-7 (Date-Only Wrong Day in UTC+)

**Principle**: Parse date-only strings as UTC midnight, not local midnight.

```javascript
normalizeCalValue(e) {
    if (!e)
        return null;

    if (this.calendarValueService.useUpdatedCalendarValueLogic)
        return new Date(this.calendarValueService.parseDateString(
            e, this.data.enableTime, this.data.ignoreTimezone));

    if (!this.data.enableTime) {
        let n = e;
        // Convert Date objects to string first
        if ("[object Date]" === Object.prototype.toString.call(n)) {
            n = n.toISOString();
        }
        if (n && typeof n === "string" && n.indexOf("T") > 0) {
            n = n.substring(0, n.indexOf("T"));
        }
        // FIX: Parse as UTC midnight instead of local midnight
        if (n && typeof n === "string") {
            return new Date(n + "T00:00:00.000Z");  // UTC midnight — no TZ shift
        }
    }

    // DateTime fields: existing behavior
    let t = moment(e).isValid() ? moment(e).toDate() : null;
    return t;
}
```

**Key change**: `new Date("2026-03-15T00:00:00.000Z")` creates UTC midnight directly, avoiding the local-midnight reinterpretation that causes the day shift.

---

## Appendix A: Complete Source Code

### A.0 `normalizeCalValue()` — Root Cause of FORM-BUG-7

Called by `applyCalChange()` when `SetFieldValue` triggers a component message. Converts the raw input to a `Date` object before passing to `calChange()`.

```javascript
normalizeCalValue(e) {
    if (!e)
        return null;
    let t = o(e).isValid() ? o(e).toDate() : null;  // o = moment; parses date-only strings as LOCAL midnight
    if (this.calendarValueService.useUpdatedCalendarValueLogic)
        return new Date(this.calendarValueService.parseDateString(e, this.data.enableTime, this.data.ignoreTimezone));
    if (!this.data.enableTime) {
        let n = e;
        "[object Date]" === Object.prototype.toString.call(n) && (n = n.toISOString()); // Date → ISO string
        n && "string" == typeof n && n.indexOf("T") > 0 && (t = o(n.substring(0, n.indexOf("T"))).toDate())
        // Strips time, re-parses date portion as local midnight — SECOND UTC+ shift for Date objects
    }
    return t
}
```

**Why this causes FORM-BUG-7**:

- `moment('2026-03-15').toDate()` = March 15 00:00 **local** = March 14 18:30 UTC (IST)
- `calChange` calls `toISOString()` → `"2026-03-14T18:30:00.000Z"`
- `getSaveValue` strips to `"2026-03-14"` — wrong day for UTC+ users

---

### A.1 `calendarValueService` Class

```javascript
class CalendarValueService {
    constructor() {
        this.useUpdatedCalendarValueLogic = false;
    }

    getSaveValue(input, enableTime, ignoreTimezone) {
        let result = typeof input === 'string' ? input : input.toISOString();

        if (this.useUpdatedCalendarValueLogic) {
            result = ignoreTimezone ? moment(input).tz('UTC', true).toISOString() : moment(input).toISOString();
        } else if (input.length > 0) {
            if (enableTime) {
                result = moment(input).format('YYYY-MM-DD[T]HH:mm:ss');
            } else {
                if (input.indexOf('T') > 0) {
                    result = input.substring(0, input.indexOf('T'));
                }
            }
        }

        return result;
    }

    parseDateString(input, enableTime, ignoreTimezone) {
        let result;
        let stripped = input.replace('Z', '');

        if (ignoreTimezone) {
            result = moment(stripped);
        } else {
            result = moment(stripped).tz('UTC', true).local();
        }

        if (!enableTime) {
            result = result.startOf('day');
        }

        return result.toISOString();
    }

    formatDateStringForDisplay(input, enableTime, ignoreTimezone) {
        const parsed = this.parseDateString(input, enableTime, ignoreTimezone);
        const format = enableTime ? 'M/D/YYYY h:mm:ss a' : 'M/D/YYYY';
        return moment(parsed).format(format);
    }
}
```

### A.2 `initCalendarValueV2()` Function

```javascript
initCalendarValueV2() {
    let isNewValue = false;

    if (this.data.enableQListener && this.data.text) {
        // URL Query String
        this.data.value = this.calendarValueService.parseDateString(
            this.data.text,
            this.data.enableTime,
            this.data.ignoreTimezone
        );
        this.value = new Date(this.data.value);
        isNewValue = true;
    } else if (this.data.value) {
        // Server/Database (note: hardcodes enableTime=true)
        this.data.value = this.calendarValueService.parseDateString(
            this.data.value,
            true,
            this.data.ignoreTimezone
        );
        this.value = new Date(this.data.value);
    } else if (this.data.enableInitialValue && this.docInfo.isFormTemplate) {
        switch (this.data.initialValueMode) {
            case CalendarInitialValueMode.CurrentDate:
                this.value = new Date();
                this.data.value = this.value.toISOString();
                break;
            case CalendarInitialValueMode.PresetDate:
                // Note: hardcodes enableTime=false, ignoreTimezone=true
                this.data.value = this.calendarValueService.parseDateString(
                    this.data.initialDate,
                    false,
                    true
                );
                this.value = new Date(this.data.value);
                break;
        }
        isNewValue = true;
    }

    if (this.value) {
        const saveValue = this.calendarValueService.getSaveValue(
            this.data.value,
            this.data.enableTime,
            this.data.ignoreTimezone
        );
        this.formPartition.setValueObjectValueByName(this.data.name, saveValue);
        if (isNewValue) {
            this.updateFormValueSubject(this.data.name, saveValue, undefined, undefined, true);
        }
    }
}
```

### A.3 `calChange()` Function

```javascript
calChange(e, t = true, n = false) {
    let i = e && !isNaN(e.getDate()) ? e.toISOString() : "";
    e && !isNaN(e.getDate()) ? this.value = e : this.value && delete this.value;
    this.data.text = this.data.value = i;
    let r = this.calendarValueService.getSaveValue(
        this.data.value,
        this.data.enableTime,
        this.data.ignoreTimezone
    );
    this.updateFormValueSubject(this.data.name, r, true, t, n);
    this.data.validationType && this.validationSubject.next({ value: r });
}
```

### A.4 `calChangeSetValue()` Function

```javascript
calChangeSetValue(e) {
    let t = e && !isNaN(e.getDate()) ? e.toISOString() : "";
    this.value = e;
    this.data.text = this.data.value = t;
    this.updateFormValueSubject(this.data.name, t);
    this.data.validationType && this.validationSubject.next({ value: t });
    this.setLegacyFieldDisplayValue();
    this.onToggle(false);
    this.dateField.nativeElement.focus();
}
```

### A.5 `VV.Form.GetFieldValue()` Function

```javascript
GetFieldValue(fieldName) {
    if (this.VV.FormPartition) {
        const fieldId = this.VV.FormPartition.getFieldIdByName(fieldName);
        const fieldDef = this.VV.FormPartition.fieldMaster[fieldId];

        if (fieldId == null) {
            return "";
        }

        if (!this.VV.FormPartition.getFormEntity().clientSideGroupsAndConditions ||
            this.isFieldAccessible(this.VV.FormPartition.uniqueId, fieldId)) {

            const value = this.VV.FormPartition.getValueObjectValue(fieldName) || "";

            switch (fieldDef.fieldType) {
                case FieldType.Calendar:
                    return this.calendarValueService.getCalendarFieldValue(fieldDef, value);
                // ... other field types
                default:
                    return value;
            }
        }
    }
}
```

### A.6 `VV.Form.SetFieldValueInternal()` Function

```javascript
SetFieldValueInternal(fieldName, value, evaluateGroupConditions = true, raiseChangeEvents = true) {
    return new Promise((resolve, reject) => {
        let fieldId = "";
        let fieldType = 0;
        let invalidField = false;

        const wrapper = document.querySelector('[vvfieldnamewrapper="' + fieldName + '"]');
        const fieldArray = this.VV.FormPartition.filterFieldArray("name", fieldName);

        if (fieldArray && fieldArray.length > 0) {
            fieldId = fieldArray[0].id;
            fieldType = fieldArray[0].fieldType;
        } else {
            invalidField = true;
        }

        // Validate input type for the field
        if (!this.VV.FormPartition.validateInputType(fieldType, value)) {
            console.log("Error setting field value. 'value' is an invalid type.");
            return resolve(null);
        }

        if (this.VV.FormPartition) {
            if (!this.VV.FormPartition.getFormEntity().clientSideGroupsAndConditions ||
                this.isFieldAccessible(this.VV.FormPartition.uniqueId, fieldId)) {

                // Set value directly in partition (no transformation for dates!)
                const result = this.VV.FormPartition.setValueObjectValueByName(fieldName, value, true);

                if (wrapper) {
                    // Send message to component with raw value
                    this.messageService.sendMessage({
                        uniqueId: this.VV.FormPartition.uniqueId,
                        sender: this,
                        var: "valueChanged",
                        type: "SetFormControlValue",
                        id: fieldId,
                        value: value,  // Raw value - no date normalization
                        evaluateGroupConditions: evaluateGroupConditions,
                        raiseChangeEvents: raiseChangeEvents,
                        valueObjectSet: true,
                        promiseResolve: resolve
                    });
                } else {
                    resolve(result);
                }
            } else {
                invalidField = true;
            }
        } else {
            invalidField = true;
        }

        if (invalidField) {
            resolve(null);
        }
    });
}
```

### A.7 `getCalendarFieldValue()` Function

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic) {
        return value;  // Returns raw value unchanged
    }

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        if (fieldDef.ignoreTimezone) {
            // Adds [Z] suffix (note: literal brackets, not timezone indicator)
            const format = "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]";
            return moment(value).format(format);
        }
        return new Date(value).toISOString();
    }

    return value;  // Legacy or date-only: returns raw value
}
```

---

## Appendix B: Glossary

| Term                              | Definition                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| UTC                               | Coordinated Universal Time — the global time standard                                    |
| ISO 8601                          | Date/time format standard (e.g., `2026-01-15T00:00:00.000Z`)                             |
| "Z" suffix                        | Indicates UTC timezone in ISO 8601. Without it, time is ambiguous.                       |
| moment.js                         | JavaScript date library used in this codebase                                            |
| moment-timezone                   | Extension to moment.js for timezone handling                                             |
| DateTime field                    | Calendar field capturing both date and time (`enableTime=true`)                          |
| Date-only field                   | Calendar field capturing date without time (`enableTime=false`)                          |
| enableTime                        | Field setting: `true` for DateTime, `false` for Date-only                                |
| ignoreTimezone                    | Setting intended to display stored time without local conversion                         |
| useLegacy                         | Field-level flag for legacy behavior (bypasses FORM-BUG-5, changes popup format)         |
| Local time                        | Time adjusted to user's browser/system timezone                                          |
| kendo-datepicker                  | The input field component for typing dates                                               |
| kendo-calendar                    | The popup calendar component for selecting dates                                         |
| VV.Form.SetFieldValue             | Developer API to programmatically set a form field value                                 |
| VV.Form.GetFieldValue             | Developer API to programmatically retrieve a form field value                            |
| VV.Form.GetDateObjectFromCalendar | Developer API returning a Date object for calendar fields (safer alternative to GFV)     |
| useUpdatedCalendarValueLogic      | Flag to enable newer date handling logic (default: false)                                |
| Config A–H                        | The 8 field configurations defined by `enableTime`/`ignoreTimezone`/`useLegacy` flags    |
| normalizeCalValue                 | Internal function that converts SetFieldValue input to a Date object (FORM-BUG-7 source) |
| GFV                               | Shorthand for `GetFieldValue`                                                            |
| GDOC                              | Shorthand for `GetDateObjectFromCalendar`                                                |

---

## Appendix C: Legacy Config (E–H) Characterization

Legacy configs have `useLegacy=true`, which changes several code paths. All findings below are from live testing across BRT, IST, and UTC0. `[LIVE]`

### Key Differences from Non-Legacy

| Behavior                     | Non-Legacy (A–D)                                             | Legacy (E–H)                                           |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| Popup save format            | Via `normalizeCalValue()` → `calChange()` → `getSaveValue()` | Via `calChangeSetValue()` — stores raw `toISOString()` |
| Typed save format            | Via `calChange()` → `getSaveValue()`                         | Same as non-legacy                                     |
| Popup vs typed consistency   | Identical stored values                                      | **Different formats** — FORM-BUG-2 confirmed           |
| `GetFieldValue` on DateTime  | Config C: `new Date().toISOString()`. Config D: fake `[Z]`   | Returns raw value — **no FORM-BUG-5**                  |
| FORM-BUG-7 (date-only, UTC+) | -1 day in IST                                                | **Same -1 day** — `useLegacy` does NOT protect         |

### Legacy Popup Storage Example (BRT)

For a date-only field (Config E), popup selection of March 15:

- **Non-legacy (Config A)**: stores `"2026-03-15"` (date-only string)
- **Legacy (Config E)**: stores `"2026-03-15T03:00:00.000Z"` (full UTC datetime with Z)

Both display correctly in BRT, but the storage format differs significantly. The legacy format includes the full UTC representation of local midnight.

### Summary

- **Use legacy to avoid FORM-BUG-5**: If you need reliable `GetFieldValue` round-trips on DateTime+ignoreTimezone fields, `useLegacy=true` is the most effective workaround.
- **Legacy does NOT fix FORM-BUG-7**: Date-only fields in UTC+ timezones still store the wrong day.
- **Legacy introduces FORM-BUG-2**: Popup and typed input produce different stored formats for the same date.
- **Legacy GFV is safe**: Returns raw stored value without transformation — no fake Z, no `new Date()` conversion.
