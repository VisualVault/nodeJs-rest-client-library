# FORM-BUG-1: Timezone Marker Stripped From Dates During Form Load

## What Happens

When a calendar field loads a date value that ends with a `Z` suffix (meaning "this time is in UTC"), the form's date parsing code silently removes the `Z` before interpreting the value. This changes the meaning of the date: what was midnight UTC becomes midnight in the user's local timezone, shifting the actual moment in time by the user's timezone offset.

For example, a preset default that resolves to `"2026-03-15T00:00:00.000Z"` (midnight UTC, March 15) would be reinterpreted as midnight Mumbai time for a user in IST (UTC+5:30) — which is actually 18:30 UTC on March 14. The date shifts backward by 5.5 hours without any warning.

---

## When This Applies

Three conditions must all be true for this bug to produce a visible effect:

### 1. The date value must arrive with a `Z` suffix

The database is SQL Server `datetime` — a timezone-unaware type that stores no `Z`. The `Z` is **added by the layers between the database and the browser**, and whether it's present depends on how the value reaches the form:

| Load Scenario                                 | Z Present? | Origin of the Z                                                                                                                                                                     |
| --------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API-created records** (`postForms`)         | Yes        | `FormInstance/Controls` response serialization appends `Z` to datetime values from `postForms`-created records ([CB-29](../../web-services/analysis/ws-bug-1-cross-layer-shift.md)) |
| **Preset / CurrentDate defaults**             | Yes        | Browser-side `toISOString()` on the `Date` object produces an ISO string with `Z`                                                                                                   |
| **Saved user data** (normal form save/reload) | **No**     | `getSaveValue()` strips `Z` before storage; the reload value arrives as `"2026-03-15T00:00:00"` (no Z)                                                                              |
| **URL parameters**                            | Varies     | Depends on what the caller puts in the URL — may or may not include `Z`                                                                                                             |

For saved user data (the most common load scenario), the Z-stripping is a **no-op** — the Z was already removed by the save path. The bug manifests primarily on **preset defaults** and **API-created records**, where the Z is injected by serialization layers outside the form's control.

### 2. The user's timezone must not be UTC+0

At UTC+0, local time equals UTC — stripping the `Z` changes the label but not the numeric value. The bug is invisible.

### 3. The field must match the affected configuration for the active code path

The FormViewer's calendar initialization has two versions. **V1** is the default — it ran during all testing on the demo environment. **V2** is an updated version that activates under specific conditions (see [Background](#background)). Both versions strip the Z, but for different field configurations:

| Code Path | Field Configuration                      | Z-Stripped?                                        | Bug Applies?                                                     |
| --------- | ---------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| **V1**    | DateTime + ignoreTZ=true (Configs D, H)  | Yes — inline `replace("Z","")`                     | **Yes**                                                          |
| **V1**    | DateTime + ignoreTZ=false (Configs C, G) | No — `new Date(value)` preserves Z                 | No — correct                                                     |
| **V1**    | Date-only (Configs A, B, E, F)           | N/A — T-truncation removes time+Z together         | No — separate defect ([FORM-BUG-7](bug-7-wrong-day-utc-plus.md)) |
| **V2**    | All configurations                       | Yes — `parseDateString()` strips Z unconditionally | **Yes**                                                          |

**V1** is the default on the demo environment and ran during the bulk of testing. **V2** activates under specific conditions (see [Background](#background)). We do not know what system-level configuration controls V2 activation in other environments.

---

## Severity: MEDIUM

- **V1 impact (active)**: Limited to DateTime + ignoreTZ=true fields (Configs D, H) when values arrive with Z — primarily API-created records and preset defaults. For saved user data, V1's save/reload cycle is self-consistent (no Z on reload), so the defect is a no-op.
- **V2 impact (uncertain scope)**: Affects all field configurations, but V2 activation is controlled by a server-side flag whose admin-level configuration is unknown. V2 was confirmed functional via manual console activation on the demo environment.
- **Overall**: The V1 scope is narrow (one field config combination, only on Z-bearing values). The V2 scope is broad but its activation status in the wild is unknown.

---

## How to Reproduce

### Manual (V1 — DateTime + ignoreTZ=true, preset default)

1. Set system timezone to `Asia/Calcutta` (IST, UTC+5:30) and restart the browser
2. Open the DateTest form template URL (creates a new empty form)
3. Observe **Field16** (Config D preset: DateTime, ignoreTZ=true, preset date 3/1/2026)
4. Open browser console and run: `VV.Form.VV.FormPartition.getValueObjectValue('Field16')`
5. **Expected**: value representing March 1, 2026 with no timezone shift
6. **Actual**: value is shifted by -5.5 hours (the IST offset), because the preset arrived as an ISO string with Z and the Z was stripped before parsing

### Manual (V2 — all configurations)

1. Set system timezone to `Asia/Calcutta` and restart the browser
2. Open the DateTest form template URL
3. In the browser console, activate V2: `VV.Form.calendarValueService.useUpdatedCalendarValueLogic = true`
4. Set a value via API: `VV.Form.SetFieldValue('Field7', '2026-03-15T00:00:00.000Z')`
5. Read it back: `VV.Form.VV.FormPartition.getValueObjectValue('Field7')`
6. **Expected**: stored date is March 15
7. **Actual**: stored date is March 14 (shifted backward by 5.5 hours)

### Automated

This bug report is backed by a supporting test repository containing Playwright automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

```bash
npx playwright test testing/date-handling/audit-bug1-tz-stripping.spec.js --project=IST-chromium
```

---

## Background

This section adds detail on V1/V2 activation and testing coverage beyond what [When This Applies](#3-the-field-must-match-the-affected-configuration-for-the-active-code-path) introduces.

**V2 activation**: Three setter locations in `main.js` can flip `useUpdatedCalendarValueLogic` to `true`:

- The form is opened in Object View mode (`?ObjectID=` in the URL)
- The form has a non-empty `modelId` context
- The `setUserInfo()` response includes the flag

These are code-level observations — we do not know what admin or account-level configuration controls the server flag. The flag is also writable from the console: `VV.Form.calendarValueService.useUpdatedCalendarValueLogic = true`.

**Testing coverage**: The bulk of this investigation ran under V1 (the demo environment default). V2 was activated manually via console for targeted tests — [TC-8-V2](../test-cases/tc-8-V2.md) confirmed FORM-BUG-5 is absent under V2 and that `parseDateString` is called. The `?ObjectID=` URL approach was attempted but requires a valid Object View context that the demo environment did not expose.

**Per-field configuration flags** referenced throughout this document:

| Flag             | What It Controls                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `enableTime`     | Whether the field stores time in addition to date (date-only vs date+time)                  |
| `ignoreTimezone` | Whether timezone conversion is skipped (treat value as display time)                        |
| `useLegacy`      | Whether the field uses the older rendering/save code path (per-field, independent of V1/V2) |

---

## The Problem in Detail

### What the "Z" Means

In ISO 8601 date strings, the trailing `Z` is a timezone designator meaning "this time is in UTC (Coordinated Universal Time)":

- `"2026-03-15T00:00:00.000Z"` = March 15, midnight **UTC**
- `"2026-03-15T00:00:00.000"` = March 15, midnight **in whatever the local timezone is**

These represent different moments in time for anyone not in UTC+0. In São Paulo (UTC-3), midnight UTC is 9 PM the previous evening. In Mumbai (UTC+5:30), midnight UTC is 5:30 AM the same day.

### What the Code Does

**V2 — `parseDateString()` (all field configurations):**

The function's first operation is to unconditionally remove the `Z`:

```javascript
// CalendarValueService.parseDateString() — line ~104126
let stripped = input.replace('Z', '');
// "2026-03-15T00:00:00.000Z" becomes "2026-03-15T00:00:00.000"
```

After this, the value is parsed as if it were in the user's local timezone. The UTC context is permanently lost.

**V1 — inline code in `initCalendarValueV1()` (DateTime + ignoreTZ=true only):**

```javascript
// initCalendarValueV1() — lines ~102889/102893
e = this.data.value.replace('Z', '');
// Then: new Date(e) — same effect as parseDateString
```

This produces identical output to `parseDateString(input, true, true)` — verified at both São Paulo and Mumbai timezones. The V1 `ignoreTZ=false` path (`new Date(this.data.value)`) preserves the Z and parses correctly.

### Step-by-Step Example

A preset default resolves to `"2026-03-15T00:00:00.000Z"` (midnight UTC, March 15). A user in Mumbai loads this form:

```text
1. Code receives:     "2026-03-15T00:00:00.000Z"
2. Strips Z:          "2026-03-15T00:00:00.000"
3. Parses as local:   March 15, 00:00 IST = March 14, 18:30 UTC
4. Stores internally: "2026-03-14T18:30:00.000Z"

Result: The date shifted backward by 5.5 hours (Mumbai's UTC offset)
```

For a user in São Paulo loading the same value:

```text
1. Code receives:     "2026-03-15T00:00:00.000Z"
2. Strips Z:          "2026-03-15T00:00:00.000"
3. Parses as local:   March 15, 00:00 BRT = March 15, 03:00 UTC
4. Stores internally: "2026-03-15T03:00:00.000Z"

Result: The date shifted forward by 3 hours (São Paulo's UTC offset)
```

For a user in London (UTC+0):

```text
1-4: No shift — local time equals UTC. The bug is invisible.
```

This example applies to both V1 (DateTime + ignoreTZ=true) and V2 (all configurations) — the Z-stripping mechanism is the same.

### The Recovery Branch (V2 Only)

The `parseDateString()` function has a second branch for fields where `ignoreTimezone` is `false`. After stripping the Z, it attempts to recover the UTC meaning using `.tz("UTC", true).local()`:

- **For date+time fields**: The recovery works correctly — it re-labels the local-parsed time as UTC and converts to local. Verified at 0h shift in São Paulo, Mumbai, and London.
- **For date-only fields**: The recovery **backfires in UTC- timezones**. The `.local()` conversion shifts midnight backward (e.g., -3h in São Paulo), crossing into the previous calendar day. Then a `.startOf("day")` call snaps to that previous day's midnight. Result: **-1 day error** in São Paulo.

This means the `ignoreTimezone=false` branch is paradoxically **worse** than `ignoreTimezone=true` for date-only fields in UTC- timezones:

| Timezone  | ignoreTimezone=false + date-only           | ignoreTimezone=true + date-only   |
| --------- | ------------------------------------------ | --------------------------------- |
| São Paulo | **-1 day** (recovery backfire)             | +3h (wrong time, but correct day) |
| Mumbai    | **-1 day** (recovery shifts past midnight) | -5.5h (wrong time, correct day)   |
| London    | Correct                                    | Correct                           |

V1 does not have this recovery branch — its `ignoreTimezone=false` path preserves the Z entirely (`new Date(this.data.value)`), which is correct.

### Relationship to FORM-BUG-7

In V1, FORM-BUG-1 and FORM-BUG-7 are **independent mechanisms** despite producing similar symptoms:

- FORM-BUG-7 is caused by `moment(dateOnlyString).toDate()` parsing date-only strings as local midnight — Z is never involved because V1 truncates everything after `T` before parsing
- FORM-BUG-1's Z-stripping only matters for DateTime values where the full ISO string (including Z) is preserved

In V2, the two bugs are connected: `parseDateString()` receives the full ISO string with Z, strips it, then passes the result to the same local-midnight parsing — so FORM-BUG-1 feeds into FORM-BUG-7.

Both bugs stem from local-time reinterpretation, but they operate through different code paths in V1.

### V1 Save/Reload Self-Consistency

Saved record reload demonstrates that V1's save/reload cycle is self-consistent for DateTime fields **when the UTC offset hasn't changed between save and load** — the save path strips Z, and the reload path parses the Z-less string as local, reconstructing the original time. This self-consistency breaks if the user's UTC offset changes (different timezone, DST transition, or travel):

**Record saved from São Paulo, loaded in 3 timezones:**

| Field  | Configuration       | São Paulo Load        | Mumbai Load           | London Load           |
| ------ | ------------------- | --------------------- | --------------------- | --------------------- |
| Field7 | date-only           | `2026-03-15`          | `2026-03-15`          | `2026-03-15`          |
| Field5 | date+time, ignoreTZ | `2026-03-15T00:00:00` | `2026-03-15T00:00:00` | `2026-03-15T00:00:00` |

**Record saved from Mumbai, loaded in 3 timezones:**

| Field  | Configuration       | São Paulo Load        | Mumbai Load           | London Load           |
| ------ | ------------------- | --------------------- | --------------------- | --------------------- |
| Field7 | date-only           | `2026-03-14`          | `2026-03-14`          | `2026-03-14`          |
| Field5 | date+time, ignoreTZ | `2026-03-15T00:00:00` | `2026-03-15T00:00:00` | `2026-03-15T00:00:00` |

The date-only field shows `2026-03-14` everywhere — FORM-BUG-7 was baked in during the Mumbai save (user entered March 15, stored as March 14). The date+time field is correct in all timezones.

This self-consistency is why the V1 Z-stripping is a no-op for saved user data: there's no Z to strip on reload.

---

## Verification

Verified via automated Playwright scripts across 3 timezones (São Paulo/BRT UTC-3, Mumbai/IST UTC+5:30, London/UTC+0) on the demo environment at `vvdemo.visualvault.com`. 10 input combinations tested per timezone via direct `parseDateString()` invocation, plus V1 inline equivalence comparison, V1 call trace (monkey-patch), and cross-timezone saved record reload. 19 tests per timezone, 5 verification phases — all timezone-dependent shifts confirmed as documented above.

V1 inline `replace("Z","") + new Date()` produces **identical output** to `parseDateString(input, true, true)` at both São Paulo and Mumbai — confirming the V1 and V2 code paths produce the same defective result for DateTime + ignoreTZ=true. `parseDateString` was confirmed V2-only via monkey-patch instrumentation (zero calls during V1 operations).

This bug report is backed by a supporting test repository containing Playwright automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

---

## Technical Root Cause

The defective code is shown in [What the Code Does](#what-the-code-does) above. This section adds file locations and call sites.

### V2: `parseDateString()`

**File**: `main.js` (bundled FormViewer application)
**Function**: `CalendarValueService.parseDateString()` — line ~104126

Call sites (V2 only):

| Line   | Calling Function               | When                               |
| ------ | ------------------------------ | ---------------------------------- |
| 102798 | `normalizeCalValue()`          | SetFieldValue                      |
| 102935 | `initCalendarValueV2()`        | Form load — URL parameter          |
| 102939 | `initCalendarValueV2()`        | Form load — saved value            |
| 102948 | `initCalendarValueV2()`        | Form load — preset date            |
| 104133 | `formatDateStringForDisplay()` | Display formatting (also V2-gated) |

### V1: Inline Code in `initCalendarValueV1()`

**File**: `main.js`
**Location**: Lines ~102889/102893
**Scope**: DateTime + ignoreTZ=true only (Configs D, H)

V1's `ignoreTimezone=false` path at line ~102893 uses `new Date(this.data.value)` without stripping Z — correct behavior.

V1's date-only path uses T-truncation + `moment(e).toDate()` — a different mechanism documented under [FORM-BUG-7](bug-7-wrong-day-utc-plus.md).

---

## Appendix: Field Configuration Reference

The test form has 8 field configurations referred to by letter throughout this document:

| Config | Field   | enableTime | ignoreTimezone | useLegacy | Description                 |
| ------ | ------- | ---------- | -------------- | --------- | --------------------------- |
| A      | Field7  | —          | —              | —         | Date-only baseline          |
| B      | Field10 | —          | ✅             | —         | Date-only + ignoreTZ        |
| C      | Field6  | ✅         | —              | —         | DateTime UTC (control)      |
| D      | Field5  | ✅         | ✅             | —         | DateTime + ignoreTZ         |
| E      | Field12 | —          | —              | ✅        | Legacy date-only            |
| F      | Field11 | —          | ✅             | ✅        | Legacy date-only + ignoreTZ |
| G      | Field14 | ✅         | —              | ✅        | Legacy DateTime             |
| H      | Field13 | ✅         | ✅             | ✅        | Legacy DateTime + ignoreTZ  |

---

## Workarounds and Fix Recommendations

See [bug-1-fix-recommendations.md](bug-1-fix-recommendations.md) for workarounds, proposed code fixes (V1 and V2), and fix impact assessment.
