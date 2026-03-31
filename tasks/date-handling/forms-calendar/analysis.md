# Calendar Field Date Handling - Complete Analysis

## Document Purpose

This document explains date handling defects in the VisualVault Forms calendar field component. It provides a comprehensive analysis of all identified bugs, the user scenarios they affect, and recommended fixes.

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

**V2 fix scope is partial:** V2 routes date-only fields through `parseDateString()` which uses `.tz("UTC",true).local()`, fixing Bug #7 for `ignoreTimezone=false` fields. For `ignoreTimezone=true` date-only fields, V2 still uses `moment(stripped).toDate()` → **Bug #7 persists in V2 for those fields.**

**V1 Bug #7 scope includes form load:** `initCalendarValueV1` uses `moment(e).toDate()` for date-only strings in every branch — saved data, URL params, and preset initial values. UTC+ users get the wrong day on form load, not only via `SetFieldValue`.

---

## Executive Summary

### The Problem

Calendar fields may display or store incorrect dates. Seven bugs have been confirmed (5 from original code analysis + 2 discovered during live testing), affecting 7 of 8 common scenarios.

### Business Impact

| Impact Area            | Description                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data Integrity         | Stored dates may differ from what users intended to enter                                                                                                                                                |
| Date Display           | Users may see the wrong calendar date (shifted by 1 day)                                                                                                                                                 |
| Reports & Queries      | Database stores UTC for initial-value fields and local time for user-input fields — same logical date has different stored values; SQL date range queries across field types return inconsistent results |
| Multi-user Consistency | The same logical date stored differently depending on user timezone and input method                                                                                                                     |

### Bug Overview

| Bug # | Name                                      | Root Cause                                                                     | Status                                                                                                     |
| ----- | ----------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 1     | Timezone Marker Stripping                 | `parseDateString()` removes "Z" suffix from UTC dates                          | Confirmed in code (V1 path)                                                                                |
| 2     | Inconsistent User Input Handlers          | Calendar popup and typed input use different save logic                        | **NOT REPRODUCED** with `useLegacy=false` in BRT. **Predicted to manifest in UTC+** — see Bug #7 asymmetry |
| 3     | Hardcoded Parameters                      | `initCalendarValueV2()` ignores actual field settings                          | Confirmed in code (V1 equivalent also hardcodes)                                                           |
| 4     | Legacy Save Format                        | `getSaveValue()` removes "Z" suffix when saving                                | Confirmed in code and live tests                                                                           |
| 5     | Inconsistent Developer API                | `GetFieldValue` adds fake literal `[Z]` causing round-trip drift               | **CONFIRMED live** — HIGH severity                                                                         |
| 6     | Invalid Date string for empty fields      | `getCalendarFieldValue()` returns `"Invalid Date"` (truthy) for empty Config D | **CONFIRMED live**                                                                                         |
| 7     | Date-only SetFieldValue wrong day in UTC+ | `normalizeCalValue()` parses as local midnight → UTC date = previous day       | **CONFIRMED live** — HIGH severity                                                                         |

### Key Insight

Date-only fields (Config A/B, `enableTime=false`) work correctly **for UTC- users** — but Bug #7 means UTC+ users (IST, Tokyo, etc.) get the wrong day stored on every `SetFieldValue` call. The only fully correct scenario for all timezones is **New Form with "Current Date" Default**.

---

## Part 1: User Scenarios & Impact

This section describes each way a date can enter the system and which bugs affect it.

---

### Scenario 1: User Selects Date via Calendar Popup

**How it works**: User clicks the calendar icon and selects a date from the popup.

**Bugs**: #2 (Inconsistent handlers)

**What happens**:

- The popup handler (`calChangeSetValue`) saves the date directly as an ISO string
- It bypasses the `getSaveValue()` function that other paths use
- Result: Date is saved with "Z" suffix (correct), but inconsistent with typed input

**Impact**: If the user selects a date via popup, then later edits it by typing, the stored format changes.

**Code path**:

```
kendo-calendar → calChangeSetValue() → updateFormValueSubject()
```

---

### Scenario 2: User Types Date in Input Field

**How it works**: User types a date directly in the input box (e.g., "1/15/2026").

**Bugs**: #1 (Timezone stripping), #2 (Inconsistent handlers), #4 (Legacy save)

**What happens**:

1. Input is parsed to a Date object
2. Converted to ISO string via `toISOString()`
3. Passed through `getSaveValue()` which strips the "Z" in legacy mode
4. On reload, `parseDateString()` strips "Z" and reinterprets as local time

**Impact**: The stored UTC value differs from what the user intended. On reload, the date may shift by 1 day depending on the user's timezone.

**Code path**:

```
kendo-datepicker → calChange() → getSaveValue() → updateFormValueSubject()
```

---

### Scenario 3: Form Loads with Previously Saved Data

**How it works**: User opens an existing form instance from the database.

**Bugs**: #1 (Timezone stripping), #3 (Hardcoded params), #4 (Legacy save)

**What happens**:

1. Server returns the saved date value
2. `initCalendarValueV2()` processes it with **hardcoded** `enableTime=true`
3. `parseDateString()` strips the "Z" suffix
4. Date is reinterpreted in user's local timezone

**Impact**: A date saved as January 15 may display as January 14 (or 16) depending on the user's timezone. The hardcoded `enableTime=true` ignores the actual field configuration.

**Code path**:

```
Server → initCalendarValueV2() [enableTime=true hardcoded] → parseDateString()
```

---

### Scenario 4: Form Opens via URL with Date Parameter

**How it works**: Form is opened with a date in the URL query string (e.g., `?birthDate=2026-01-15T00:00:00.000Z`).

**Bugs**: #1 (Timezone stripping), #4 (Legacy save)

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

**How it works**: Form template is configured with a specific default date (e.g., "January 1, 2026").

**Bugs**: #1 (Timezone stripping), #3 (Hardcoded params), #4 (Legacy save)

**What happens**:

1. Form template provides the preset date
2. `initCalendarValueV2()` processes it with **hardcoded** `enableTime=false` and `ignoreTimezone=true`
3. `parseDateString()` strips "Z" and parses as local time
4. `.startOf("day")` is applied in local timezone

**Impact**: A preset date of January 1 may display as December 31 for users in positive UTC offsets. The hardcoded parameters ignore the actual field configuration.

**Code path**:

```
Template → initCalendarValueV2() [enableTime=false, ignoreTimezone=true hardcoded] → parseDateString()
```

---

### Scenario 6: New Form with "Current Date" Default

**How it works**: Form template is configured to default to today's date.

**Bugs**: None ✓

**What happens**:

1. Code executes `new Date()` to get current date/time
2. Converts directly to ISO string via `toISOString()`
3. No stripping or reinterpretation occurs

**Impact**: Works correctly. This is the only scenario without bugs.

**Code path**:

```
Template → new Date() → toISOString()
```

---

### Scenario 7: Developer Sets Date via VV.Form.SetFieldValue

**How it works**: Developer calls `VV.Form.SetFieldValue("dateField", new Date())` or passes a date string programmatically.

**Bugs**: #2 (Inconsistent handlers), #5 (Inconsistent API)

**What happens**:

1. `SetFieldValue()` calls `SetFieldValueInternal()`
2. Value is validated via `moment(value).isValid()`
3. Raw value is passed directly to `setValueObjectValueByName()` without transformation
4. Message is sent to calendar component
5. Component triggers `calChangeSetValue()` which bypasses `getSaveValue()`

**Impact**:

- Raw value passed without any date normalization
- If developer passes a Date object, it's converted via `toISOString()` in the component
- If developer passes a string, it's stored as-is with no format validation
- Same inconsistency as calendar popup (Bug #2)

**Code path**:

```
VV.Form.SetFieldValue() → SetFieldValueInternal() → setValueObjectValueByName(rawValue)
                        → sendMessage({ value: rawValue })
                            → Calendar receives message
                            → calChangeSetValue() - bypasses getSaveValue()
```

---

### Scenario 8: Developer Gets Date via VV.Form.GetFieldValue

**How it works**: Developer calls `VV.Form.GetFieldValue("dateField")` to retrieve the stored value.

**Bugs**: #5 (Inconsistent API)

**What happens**:

1. `GetFieldValue()` retrieves value from form partition
2. For Calendar fields, calls `getCalendarFieldValue()`
3. Return format varies based on multiple flags

**The `getCalendarFieldValue()` behavior**:

| Mode          | enableTime | ignoreTimezone | Return Format                       |
| ------------- | :--------: | :------------: | ----------------------------------- |
| Updated logic |    any     |      any       | Raw value unchanged                 |
| Legacy        |    true    |      true      | Adds `[Z]` suffix via format string |
| Legacy        |    true    |     false      | `new Date(value).toISOString()`     |
| Legacy        |   false    |      any       | Raw value                           |

**Impact**:

- Developer cannot predict what format they'll receive
- Round-trip inconsistency: `SetFieldValue(GetFieldValue())` may not preserve the original value
- Different behavior based on 4 different configuration flags

**Code path**:

```
VV.Form.GetFieldValue() → getValueObjectValue() → getCalendarFieldValue()
```

---

### Scenario Summary Matrix

| Scenario          | Bug #1 | Bug #2 | Bug #3 | Bug #4 | Bug #5 | Bug #6 | Bug #7 | Status                                                  |
| ----------------- | :----: | :----: | :----: | :----: | :----: | :----: | :----: | ------------------------------------------------------- |
| 1. Calendar Popup |   -    |  ✗\*   |   -    |   -    |   -    |   -    |   -    | ⚠️ Bug #2 not reproduced with `useLegacy=false`         |
| 2. Typed Input    |   ✗    |  ✗\*   |   -    |   ✗    |   -    |   -    |   -    | ❌ Broken (Bug #2 unconfirmed)                          |
| 3. Saved Data     |   ✗    |   -    |   ✗    |   ✗    |   -    |   -    |   -    | ❌ Broken                                               |
| 4. URL Parameter  |   ✗    |   -    |   -    |   ✗    |   -    |   -    |   -    | ❌ Broken                                               |
| 5. Preset Date    |   ✗    |   -    |   ✗    |   ✗    |   -    |   -    |   -    | ❌ Broken                                               |
| 6. Current Date   |   -    |   -    |   -    |   -    |   -    |   -    |   -    | ✅ Works (UTC- only)                                    |
| 7. SetFieldValue  |   -    |   -    |   -    |   -    |   ✗    |   -    |   ✗    | ❌ Broken (Config D drift; date-only wrong day in UTC+) |
| 8. GetFieldValue  |   -    |   -    |   -    |   -    |   ✗    |   ✗    |   -    | ❌ Broken (fake Z + Invalid Date for empty)             |

\* Bug #2 not reproduced with `useLegacy=false` in live tests. May only affect `useLegacy=true`.

---

## Part 2: Bug Analysis

This section provides technical details for each bug.

---

### Bug #1: Timezone Marker Stripping in parseDateString()

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

---

### Bug #2: Inconsistent User Input Handlers

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

**Impact**: The same date selected via popup vs typed in the input field may be stored in different formats, leading to inconsistent behavior on reload.

**Live Test Status**: NOT REPRODUCED with `useLegacy=false` in BRT. Both popup and typed produce identical stored values in BRT. This may be because the inconsistency between `calChangeSetValue` and `calChange` is masked in BRT by Bug #7 not affecting either path. However, **in UTC+ timezones (IST, Tokyo, etc.) Bug #7 creates a different asymmetry**:

- Popup creates a `Date` object → `normalizeCalValue` Date-object branch → **double local-midnight shift → -2 days** in IST
- Typed input creates a string → `normalizeCalValue` string branch → **single local-midnight shift → -1 day** in IST

Same intended date, different stored result depending on input method. This is untested with live data — see test cases 1-A-IST and 2-A-IST in `test/results.md`.

**Affected Scenarios**: 1, 2

---

### Bug #3: Hardcoded Parameters in initCalendarValueV2()

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

### Bug #4: Legacy Save Format Strips Timezone

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

**Impact**: When this value is later reloaded, `parseDateString()` (Bug #1) can't strip "Z" because it's already gone—but the value is still ambiguous and will be interpreted as local time.

**Affected Scenarios**: 2, 3, 4, 5

---

### Bug #5: Inconsistent Developer API Behavior

**Root Cause**: `VV.Form.SetFieldValue` and `VV.Form.GetFieldValue` have inconsistent transformation logic for date values.

**Location**: `SetFieldValueInternal()`, `GetFieldValue()`, `getCalendarFieldValue()`

**SetFieldValue behavior**:

```javascript
SetFieldValueInternal(fieldName, value) {
    // ...
    // Raw value passed directly - NO date transformation
    this.VV.FormPartition.setValueObjectValueByName(fieldName, value);
    this.messageService.sendMessage({
        value: value,  // Raw value sent to component
        // ...
    });
}
```

**GetFieldValue behavior** (via `getCalendarFieldValue`):

```javascript
getCalendarFieldValue(fieldDef, value) {
    if (this.useUpdatedCalendarValueLogic)
        return value;  // Raw value

    if (!fieldDef.useLegacy && fieldDef.enableTime) {
        if (fieldDef.ignoreTimezone) {
            return moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]");  // Adds [Z]
        }
        return new Date(value).toISOString();  // Standard ISO
    }

    return value;  // Legacy or date-only: raw value
}
```

**The Inconsistency**:

| Operation                                           | Transformation                  | Result                             |
| --------------------------------------------------- | ------------------------------- | ---------------------------------- |
| SetFieldValue                                       | None - raw value passed through | Depends on what developer provides |
| GetFieldValue (updated logic)                       | None - returns raw value        | Whatever is stored                 |
| GetFieldValue (legacy + DateTime + ignoreTimezone)  | Adds `[Z]` suffix               | May differ from stored value       |
| GetFieldValue (legacy + DateTime + !ignoreTimezone) | `new Date().toISOString()`      | ISO format                         |
| GetFieldValue (legacy + Date-only)                  | None - returns raw value        | Whatever is stored                 |

**Impact**:

1. **No round-trip consistency**: `SetFieldValue(GetFieldValue("field"))` may not preserve the original value
2. **Unpredictable formats**: Developer cannot predict what format `GetFieldValue` will return
3. **ignoreTimezone adds fake "Z"**: When `ignoreTimezone=true`, the `[Z]` suffix is added even if the value doesn't represent UTC
4. **Different behavior per mode**: Makes it difficult to write reliable client code

**Example**:

```javascript
// Developer sets a date
VV.Form.SetFieldValue('birthDate', '2026-01-15T00:00:00.000Z');

// Later, developer retrieves it
let value = VV.Form.GetFieldValue('birthDate');

// Depending on field configuration, value could be:
// - "2026-01-15T00:00:00.000Z" (updated logic)
// - "2026-01-15T00:00:00.000[Z]" (legacy + ignoreTimezone) ← Note: [Z] not Z
// - "2026-01-15T05:00:00.000Z" (legacy + converted to local then back)
// - "2026-01-15" (date-only field)
```

**Affected Scenarios**: 7, 8

---

---

### Bug #6: GetFieldValue Returns `"Invalid Date"` for Empty Config D Fields

**Root Cause**: `getCalendarFieldValue()` calls `moment(value).format(...)` when `value=""`. `moment("")` is an invalid moment, and `.format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")` returns the string `"Invalid Date"`.

**Location**: `getCalendarFieldValue()` — line 104114

**Conditions**: `enableTime=true && ignoreTimezone=true && !useLegacy && value=""`

**Impact**: `GetFieldValue()` returns `"Invalid Date"` (a truthy non-empty string) instead of `""` or `null`. Any developer check `if (VV.Form.GetFieldValue('field'))` incorrectly evaluates to `true` for an empty field.

**Affected Scenarios**: 8 (GetFieldValue)

---

### Bug #7: SetFieldValue on Date-Only Fields Stores Wrong Day for UTC+ Timezones

**Root Cause**: `normalizeCalValue()` uses `moment(input).toDate()` to parse date-only strings. Moment parses date-only strings as **local midnight** (not UTC midnight, unlike native `new Date('YYYY-MM-DD')`). For UTC+ users, local midnight = previous UTC day. `calChange()` then calls `toISOString()` which gives the previous UTC day, and `getSaveValue()` strips to that date.

**Location**: `normalizeCalValue()` — line ~102793

**The Double-Shift for Date Objects**:
When a `Date` object is passed, `normalizeCalValue` converts it to ISO via `toISOString()`, strips the time to get a date string, then re-parses that date string as local midnight — applying the UTC+offset subtraction twice.

**Conditions**: `enableTime=false` (date-only fields — Configs A, B, E, F) + UTC+ timezone user

**Impact**: Every `SetFieldValue` call on date-only fields stores the **previous day** for UTC+ users. UTC- users (including BRT) are unaffected because local midnight → UTC is still the same calendar day.

| Input                             | BRT (UTC-3) | IST (UTC+5:30) |
| --------------------------------- | ----------- | -------------- |
| Any date string / US format / ISO | Correct ✓   | -1 day ✗       |
| `Date` object (local midnight)    | Correct ✓   | -2 days ✗      |

**Secondary effect — popup vs typed diverge in UTC+**: Calendar popup input sends a `Date` object to `normalizeCalValue` (double-shift, -2 days in IST). Typed input sends a string (single-shift, -1 day in IST). In BRT neither shift applies, so the two inputs look identical. In UTC+ they produce different stored values for the same intended date — a manifestation of this bug that creates input-method inconsistency without `useLegacy=true`. Untested in live session; see 1-A-IST and 2-A-IST in `test/results.md`.

**V1 load path also affected**: `initCalendarValueV1` uses `moment(e).toDate()` for date-only saved data, URL params, and preset values — same root cause. UTC+ users get the wrong day on form load, not only via `SetFieldValue`. Code-confirmed; no live test yet (requires saving and reloading a record from IST).

**Affected Scenarios**: 7 (SetFieldValue), 1/2 (popup/typed input in UTC+), and load path for saved data/presets in UTC+

**Affected Configs**: A, B (and E, F when legacy access is available)

---

### Database Mixed Timezone Storage (Structural Finding)

**Status:** Confirmed live via direct SQL query (TC-2.10 — 2026-03-30, BRT). Not a discrete code bug — a consequence of two separate storage code paths writing to the same table with no timezone metadata.

**Finding:** Calendar field values in the same form record are stored in different timezone contexts depending on how the field is populated:

| Field type                               | Config                                          | Storage format          | Timezone of stored value                                                  |
| ---------------------------------------- | ----------------------------------------------- | ----------------------- | ------------------------------------------------------------------------- |
| Initial value — CurrentDate              | `enableInitialValue=true`, `initialValueMode=0` | `MM/dd/yyyy HH:mm:ss`   | **UTC** — captured via `new Date().toISOString()` at save time            |
| Initial value — Preset                   | `enableInitialValue=true`, `initialValueMode=1` | `MM/dd/yyyy HH:mm:ss`   | **UTC** — preset local midnight converted to UTC via `toISOString()`      |
| User input (popup, typed, SetFieldValue) | `enableInitialValue=false`, any config          | ISO-like or date string | **Local time** — stored via `getSaveValue()` which strips Z before saving |

**Observed DB values (DateTest-000004, saved from BRT UTC-3, target date 2026-03-15):**

| Field                            | DB value                | Interpretation                                                  |
| -------------------------------- | ----------------------- | --------------------------------------------------------------- |
| DataField1 (CurrentDate)         | `3/27/2026 8:02:51 PM`  | UTC timestamp of the save action (BRT 5:02 PM = UTC 8:02 PM)    |
| DataField2 (Preset Mar 1)        | `3/1/2026 3:00:00 AM`   | UTC equivalent of BRT midnight March 1 (`2026-03-01T03:00:00Z`) |
| DataField5 (Config D user input) | `3/15/2026 12:00:00 AM` | Local BRT midnight, stored without any timezone offset          |
| DataField6 (Config C user input) | `3/15/2026 12:00:00 AM` | Same — local BRT midnight                                       |
| DataField7 (Config A user input) | `3/15/2026 12:00:00 AM` | Same — local BRT midnight                                       |

**Consequence for queries and reports:** The database stores no timezone marker — no suffix, column, or metadata indicates whether `3/15/2026 12:00:00 AM` is UTC or BRT. Reports or scheduled scripts that compare dates across field types, or that filter `WHERE DataFieldX BETWEEN @start AND @end`, will silently return wrong results for users in UTC+ timezones (where the local-time and UTC representations of the same date diverge). DataField2 (`3/1/2026 3:00:00 AM`) and DataField5 (`3/15/2026 12:00:00 AM`) represent the same kind of value — midnight on the target date — stored in incompatible formats.

**Root cause (code path):**

- Initial value path: `new Date()` or preset → `toISOString()` → `getSaveValue()` strips Z → result is UTC time without suffix
- User input path: `normalizeCalValue()` → `calChange()` → `getSaveValue()` strips Z from local-time ISO string → result is local time without suffix

Both paths call `getSaveValue()` which strips the Z, but the upstream time representation differs: UTC object vs local-time ISO string.

**Evidence:** `tasks/date-handling/forms-calendar/test-cases/tc-2-10-db-storage-mixed-tz-brt.md`

---

## Part 3: Recommended Solutions

### Solution for Bug #1 (Timezone Stripping)

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

### Solution for Bug #2 (Inconsistent Handlers)

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

### Solution for Bug #3 (Hardcoded Parameters)

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

### Solution for Bug #4 (Legacy Save Format)

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

### Solution for Bug #5 (Inconsistent Developer API)

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
        return "";
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

## Appendix A: Complete Source Code

### A.0 `normalizeCalValue()` — Root Cause of Bug #7

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

**Why this causes Bug #7**:

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

| Term                         | Definition                                                         |
| ---------------------------- | ------------------------------------------------------------------ |
| UTC                          | Coordinated Universal Time - the global time standard              |
| ISO 8601                     | Date/time format standard (e.g., `2026-01-15T00:00:00.000Z`)       |
| "Z" suffix                   | Indicates UTC timezone in ISO 8601. Without it, time is ambiguous. |
| moment.js                    | JavaScript date library used in this codebase                      |
| moment-timezone              | Extension to moment.js for timezone handling                       |
| DateTime field               | Calendar field capturing both date and time                        |
| Date-only field              | Calendar field capturing date without time                         |
| enableTime                   | Field setting: `true` for DateTime, `false` for Date-only          |
| ignoreTimezone               | Setting intended to display stored time without local conversion   |
| Local time                   | Time adjusted to user's browser/system timezone                    |
| kendo-datepicker             | The input field component for typing dates                         |
| kendo-calendar               | The popup calendar component for selecting dates                   |
| VV.Form.SetFieldValue        | Developer API to programmatically set a form field value           |
| VV.Form.GetFieldValue        | Developer API to programmatically retrieve a form field value      |
| useUpdatedCalendarValueLogic | Flag to enable newer date handling logic (default: false)          |
| useLegacy                    | Field-level flag for legacy behavior                               |
