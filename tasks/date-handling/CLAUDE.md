# Date Handling — Cross-Platform Bug Investigation

## What This Is

Comprehensive investigation of date handling defects across **all VisualVault components** — not just Forms. The goal is to find, test, and document every date-related bug in the platform, covering how dates are stored, transformed, displayed, and exchanged between components.

## Scope

| Component                                | Status                            | Folder                      |
| ---------------------------------------- | --------------------------------- | --------------------------- |
| **Forms — Calendar Fields**              | IN PROGRESS (~57/108+ tests done) | `forms-calendar/`           |
| **Web Services (REST API)**              | NOT STARTED                       | `web-services/` (to create) |
| **Analytic Dashboards**                  | NOT STARTED                       | `dashboards/` (to create)   |
| **VisualVault Reports**                  | NOT STARTED                       | `reports/` (to create)      |
| **Files (document dates)**               | NOT STARTED                       | `files/` (to create)        |
| **Workflows (date triggers, deadlines)** | NOT STARTED                       | `workflows/` (to create)    |
| **Node.js Client Library**               | NOT STARTED                       | `node-client/` (to create)  |

## Folder Structure

```
tasks/date-handling/
  CLAUDE.md                          # This file — overall context
  forms-calendar/                    # Forms calendar field investigation
    analysis.md                # Code review + confirmed bug analysis
    test/results.md                  # Live browser test evidence (source of truth)
  web-services/                      # (future) REST API date handling
  dashboards/                        # (future) Analytic Dashboard dates
  reports/                           # (future) VV Reports date filtering/display
  files/                             # (future) Document date metadata
  workflows/                         # (future) Workflow date triggers
  node-client/                       # (future) Node.js client library date handling
```

## Cross-Cutting Questions

1. **Storage format**: What format are dates stored in the database? Is it consistent across components?
2. **Timezone handling**: Does each component handle timezones the same way? What happens when users in different timezones access the same data?
3. **API contract**: What format does the REST API accept and return for dates? Is it consistent with what Forms store?
4. **Round-trip integrity**: Can a date be read from one component and written to another without shifting?
5. **Query/filter behavior**: Do date filters in Reports and Dashboards correctly match stored dates considering timezone ambiguity?
6. **Developer API consistency**: Do `GetFieldValue`, `SetFieldValue`, and REST API endpoints return dates in the same format?

---

## Forms Calendar Fields (Current Focus)

### Progress

**~57 of ~108+ test cases completed.** 7 bugs confirmed (5 from original analysis + 2 new). Testing done across two timezones: BRT (UTC-3) and IST (UTC+5:30).

### Files

| File                             | Purpose                                                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `forms-calendar/analysis.md`     | Code review — 5 original bugs + 2 confirmed new bugs. Appendix has extracted source functions.                                     |
| `forms-calendar/test/results.md` | Live browser test evidence — source of truth for confirmed behavior.                                                               |
| `forms-calendar/test/index.md`   | Quick-reference dashboard — confirmed bugs, bug × config matrix, coverage summary, failing/passing test IDs, formal TC file index. |
| `forms-calendar/test/`           | Individual TC files — one per test scenario, browser-verified before writing.                                                      |

### V1 vs V2 Code Path — Critical Note

The form calendar has two init paths gated by `useUpdatedCalendarValueLogic`:

```javascript
useUpdatedCalendarValueLogic ? initCalendarValueV2() : initCalendarValueV1();
```

- **`useUpdatedCalendarValueLogic = false`** (default) → runs **V1**
- **`useUpdatedCalendarValueLogic = true`** → runs **V2**

**All live test results reflect V1 behavior.** When analyzing init/load behavior, read `initCalendarValueV1` (line ~102886 in main.js). Per project preference, use V2 as the reference for fix planning since it is the intended successor.

**When is the flag called:**
This conditional runs at exactly two points in the component lifecycle:

1. **`ngOnInit()`** (line ~102744) — once when the calendar component mounts
2. **`checkMessage()`** (line ~102787) — when a `relationshipObjectChanged` message is received (a related/linked object on the form changes)

**When `useUpdatedCalendarValueLogic` becomes `true` (V2 activates):**
Three setter locations in main.js, all representing Object View context:

1. **Server flag** (line ~42218) — `setUserInfo()` sets it from the user info API response: `!!userInfo.hasOwnProperty("useUpdatedCalendarValueLogic") && userInfo.useUpdatedCalendarValueLogic`. Not set by default → `false`.
2. **`?ObjectID=` URL parameter** (line ~179699) — set to `true` when the form is opened linked to a specific object (Object View mode).
3. **Non-empty `modelId`** (line ~180554) — set to `true` when the form's model context is loaded with a modelId.

All live tests use a standard standalone form (no ObjectID, no modelId, no server flag) → V1 runs for all tests.

**`useUpdatedCalendarValueLogic` is a service-level flag** (`CalendarValueService`, line ~104098) — not per-field; flipping it affects all calendar fields on the form simultaneously.

**V2 fix scope — not complete:**
V2 partially fixes Bug #7 for date-only fields by routing through `parseDateString()` which uses `.tz("UTC",true).local()` (treats the parsed time as UTC before converting to local). However, for `ignoreTimezone=true` date-only fields, V2 still falls through to plain `moment(stripped).toDate()` — **Bug #7 persists in V2 for those fields.**

**V1 Bug #7 scope is wider than SetFieldValue:**
In V1, every code path that handles a date-only string ends at `moment(e).toDate()` — not just `normalizeCalValue()`. This includes the form load path in `initCalendarValueV1` (lines ~102886–102931): saved data, URL parameter input, and preset initial values all parse via local midnight. UTC+ users see the wrong day on form load, before any `SetFieldValue` is called.

| Scenario                         | V1                                                            | V2                                                                               |
| -------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| DateTime, ignoreTZ=false — load  | `new Date(value)` — Z preserved, correct                      | `parseDateString()` → strips Z → `.tz("UTC",true).local()`                       |
| DateTime, ignoreTZ=true — load   | Strip Z → `new Date(e)` → local parse                         | Strip Z → `moment(stripped)` → local (same as V1)                                |
| Date-only, ignoreTZ=false — load | Strip T → `moment(e).toDate()` → **Bug #7**                   | Strip T → `parseDateString()` → UTC → **fixed**                                  |
| Date-only, ignoreTZ=true — load  | Strip T → `moment(e).toDate()` → **Bug #7**                   | Strip T → `moment(stripped)` → **Bug #7 persists**                               |
| Preset date (date-only)          | `moment(initialDate).toDate()` → **Bug #7**                   | `parseDateString()` path → fixed for non-ignoreTZ                                |
| SetFieldValue (date-only)        | `normalizeCalValue()` → `moment(input).toDate()` → **Bug #7** | `normalizeCalValue()` checks flag → `parseDateString()` → fixed for non-ignoreTZ |

### Confirmed Code Paths (main.js line references)

**SetFieldValue path:**

```
VV.Form.SetFieldValue()
  → SetFieldValueInternal()          sets raw value in partition + sends component message
  → applyCalChange()                 component receives message
  → normalizeCalValue()  ~102793     converts input to a Date object (Bug #7 lives here)
  → calChange()          ~102824     calls toISOString() + getSaveValue()
  → getSaveValue()       ~104100     strips Z and formats for storage
  → updateFormValueSubject()         stores final value
```

**GetFieldValue path:**

```
VV.Form.GetFieldValue()
  → getValueObjectValue()            reads raw stored value
  → getCalendarFieldValue()  104114  applies output transformation (Bug #5, Bug #6 live here)
```

**Form load path (V1 — default):**

```
initCalendarValueV1()    ~102886
  → parseDateString()    ~104126    strips Z, re-parses as local (Bug #1 lives here)
  → getSaveValue()       ~104100    strips Z and formats for storage
  → setValueObjectValueByName()     stores final value
```

**Shared service functions:**

- `parseDateString()` — line 104126
- `getSaveValue()` — line 104100
- `getCalendarFieldValue()` — line 104114
- `normalizeCalValue()` — line ~102793

### Confirmed Bugs

**Bug #5 — Fake [Z] in GetFieldValue (HIGH SEVERITY)**

`getCalendarFieldValue()` adds a literal `[Z]` to local time values when `enableTime=true && ignoreTimezone=true && !useLegacy`. Causes progressive date drift on every `SetFieldValue(GetFieldValue())` round-trip:

- UTC-3 (São Paulo): -3h per trip, full day lost after 8 trips; **year boundary crossed in 1 trip from Jan 1 midnight**
- UTC+5:30 (Mumbai): +5:30h per trip, full day gained after ~4.4 trips
- UTC+0 (London): no drift (fake Z happens to be correct)

**Only affects**: `enableTime=true` + `ignoreTimezone=true` + `useLegacy=false`

---

**Bug #6 — GetFieldValue returns `"Invalid Date"` string for empty Config D fields (MEDIUM)**

When a `enableTime=true && ignoreTimezone=true` field is cleared (set via `""` or `null`):

- `getValueObjectValue()` correctly returns `""`
- `GetFieldValue()` returns the string `"Invalid Date"` — which is **truthy**
- `if (VV.Form.GetFieldValue('field'))` evaluates `true` for an empty field

---

**Bug #7 — SetFieldValue on date-only fields stores wrong day for UTC+ timezones (HIGH SEVERITY)**

`normalizeCalValue()` uses `moment(input).toDate()` which parses date-only strings as **local midnight**. For UTC+ users (e.g., IST UTC+5:30), local midnight = previous UTC day. `getSaveValue()` then extracts the UTC date → stores the previous day.

| Input                                | BRT (UTC-3) stores | IST (UTC+5:30) stores | Days off |
| ------------------------------------ | ------------------ | --------------------- | -------- |
| `"2026-03-15"`                       | `"2026-03-15"` ✓   | `"2026-03-14"` ✗      | -1       |
| `"03/15/2026"`                       | `"2026-03-15"` ✓   | `"2026-03-14"` ✗      | -1       |
| `"2026-03-15T00:00:00"`              | `"2026-03-15"` ✓   | `"2026-03-14"` ✗      | -1       |
| `"2026-03-15T00:00:00.000Z"`         | `"2026-03-15"` ✓   | `"2026-03-14"` ✗      | -1       |
| `new Date(2026,2,15)` local midnight | `"2026-03-15"` ✓   | `"2026-03-13"` ✗      | -2       |

Double-shift for Date objects: `Date.toISOString()` → strip Z → re-parse as local → second midnight conversion.

**Affects**: All date-only configs (A, B, E, F — `enableTime=false`). BRT is unaffected because UTC-3 midnight is still the same UTC day.

---

**Database Mixed Timezone Storage**

Initial value fields (Current Date, Preset) store UTC; user-input fields store local time without timezone info. Same logical date has different DB representations depending on code path. SQL queries filtering by date will get inconsistent results across field types.

---

**Bug #2 — Inconsistent Handlers (NOT REPRODUCED with useLegacy=false in BRT)**

With `useLegacy=false` in BRT, popup and typed input produce identical values. May only exist with `useLegacy=true` (no access to test).

**Untested in IST**: Code analysis predicts they will differ in UTC+ timezones — popup creates a Date object (normalizeCalValue Date path → double-shift, -2 days in IST) while typed creates a string (string path → single-shift, -1 day). Same intended date, different stored values. See Categories 1-A-IST and 2-A-IST.

### Test Forms

**Template URL** (creates new form each load):

```
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**Saved record — DateTest-000004 Rev 1** (saved from BRT, has all field configs):

```
https://vvdemo.visualvault.com/FormViewer/app?DataID=2ae985b5-1892-4d26-94da-388121b0907e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**IST test record — DateTest-000009** (created during IST session, unsaved):

- New record created from template during IST timezone testing session

### Test Form Fields

| Field       | enableTime | ignoreTZ | useLegacy | Config ID | Purpose                                            |
| ----------- | :--------: | :------: | :-------: | :-------: | -------------------------------------------------- |
| DataField1  |    OFF     |   OFF    |    OFF    |     A     | Current Date default                               |
| DataField2  |    OFF     |   OFF    |    OFF    |     A     | Preset 3/1/2026 default                            |
| DataField3  |    OFF     |   OFF    |    OFF    |     A     | Current Date default (duplicate)                   |
| DataField4  |    OFF     |   OFF    |    OFF    |     A     | Preset 3/1/2026 (duplicate)                        |
| DataField5  |   **ON**   |  **ON**  |    OFF    |     D     | **Bug #5 vulnerable** — DateTime + ignoreTZ        |
| DataField6  |   **ON**   |   OFF    |    OFF    |     C     | DateTime, proper UTC — stable control              |
| DataField7  |    OFF     |   OFF    |    OFF    |     A     | Date-only baseline (**Bug #7 vulnerable in UTC+**) |
| DataField10 |    OFF     |  **ON**  |    OFF    |     B     | Date-only + ignoreTZ (no effect on date-only)      |

DataField8/9 do not exist (naming jumped from 7 to 10).

### Key JavaScript for Inspecting Field State

```javascript
VV.Form.VV.FormPartition.fieldMaster; // field definitions (keyed by GUID)
VV.Form.VV.FormPartition.getValueObjectValue('DataField5'); // raw stored value
VV.Form.GetFieldValue('DataField5'); // processed return (Bug #5 adds fake Z)
VV.Form.SetFieldValue('DataField5', value); // set value (goes through normalizeCalValue)
// Verify V1 is active (expected: false) — works in DevTools console or Chrome extension
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// false = V1 running (default) | true = V2 running (Object View or server flag)
// Works on all environments once the form is loaded. VV.Form is the public API.
```

### Testing Method

Tests run via **Claude-in-Chrome MCP extension**. The extension tab must be created fresh each session.

**Cross-timezone testing:**

- DevTools Sensors "Location" preset does **NOT** override JavaScript `Date` timezone — it only overrides `navigator.geolocation`
- To simulate a different timezone: change **macOS system timezone** + **restart Chrome**
    ```bash
    sudo systemsetup -settimezone Asia/Calcutta   # IST (UTC+5:30)
    sudo systemsetup -settimezone America/Sao_Paulo  # BRT (UTC-3, restore)
    ```
- Verify active timezone in browser: `new Date().toString()` — check the GMT offset

### What Has NOT Been Tested (Forms)

- `useLegacy=true` — no access to enable
- `useUpdatedCalendarValueLogic=true` — V2 code path never exercised; flag confirmed `false` via live `CalendarValueService` instance scan (`__ngContext__` approach) on 2026-03-30. Re-verify if testing on a different account or with `?ObjectID=` URL param.
- **Popup vs typed input in IST for date-only fields** (Categories 1-A-IST, 2-A-IST) — code predicts popup → -2 days (Date object double-shift), typed → -1 day (string single-shift) — different stored values for same intended date; needs live test
- **V1 load path Bug #7 in IST** — `initCalendarValueV1` uses `moment(e).toDate()` for saved data and preset dates; UTC+ users should get wrong day on form load; code-confirmed but no live test (DateTest-000009 was not saved)
- URL parameter input — needs `enableQListener=true` fields
- Web service / scheduled script input — needs server-side execution (Category 10)
- Preset/Current Date with `enableTime=true` fields — needs new test form fields
- Save from IST timezone, reload from BRT (Category 3-D-IST-BRT) — IST record not saved
- Legacy configs E–H (useLegacy=true)

### Next Steps (Forms)

1. **Verify active code path** (if account/URL changes): Run the `__ngContext__` snippet from the Key JavaScript section in DevTools. Returns `false` = V1. Already confirmed `false` on 2026-03-30 for this account/form.
2. **Category 1/2 IST — popup vs typed for Config A**: In IST, pick March 15 from popup on DataField7, then type 03/15/2026. Expected: popup → `"2026-03-13"`, typed → `"2026-03-14"`. Confirms Bug #7 asymmetry between Date object (popup) and string (typed) paths.
3. **Category 10 — Web service input**: How production scripts set dates. Write a Node.js test script.
4. **Category 3-D-IST-BRT**: Save a record from IST, switch back to BRT, reload and observe.
5. **Category 5/6 — Preset/Current Date on DateTime fields**: Requires new test form fields with `enableTime=true` + initial value configuration.
6. **Category 4 — URL parameters**: Requires `enableQListener=true` fields.
7. **Legacy configs (E–H)**: When `useLegacy=true` access is available.

See `forms-calendar/test/results.md` for the full ~108+ test case matrix and detailed session results. See `forms-calendar/test/index.md` for the summary dashboard — confirmed bugs, coverage counts, and formal TC file index.
