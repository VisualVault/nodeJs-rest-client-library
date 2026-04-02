# Date Handling — Cross-Platform Bug Investigation

## What This Is

Comprehensive investigation of date handling defects across **all VisualVault components** — not just Forms. The goal is to find, test, and document every date-related bug in the platform, covering how dates are stored, transformed, displayed, and exchanged between components.

## Scope

| Component                                | Status                           | Folder                     |
| ---------------------------------------- | -------------------------------- | -------------------------- |
| **Forms — Calendar Fields**              | IN PROGRESS (~71/225 tests done) | `forms-calendar/`          |
| **Web Services (REST API)**              | IN PROGRESS (0 tests done)       | `web-services/`            |
| **Analytic Dashboards**                  | NOT STARTED                      | `dashboards/` (to create)  |
| **VisualVault Reports**                  | NOT STARTED                      | `reports/` (to create)     |
| **Files (document dates)**               | NOT STARTED                      | `files/` (to create)       |
| **Workflows (date triggers, deadlines)** | NOT STARTED                      | `workflows/` (to create)   |
| **Node.js Client Library**               | NOT STARTED                      | `node-client/` (to create) |

## Folder Structure

```
tasks/date-handling/
  CLAUDE.md                          # This file — overall context
  forms-calendar/                    # Forms calendar field investigation
    analysis.md                # Code review + confirmed bug analysis
    test/results.md                  # Live browser test evidence (source of truth)
  web-services/                      # REST API date handling investigation
    analysis.md                      # API analysis, hypotheses, confirmed behaviors
    matrix.md                        # Test matrix — WS-1 through WS-7 categories
    results.md                       # Live test evidence
    test-cases/                      # Individual TC spec files
    runs/                            # Immutable execution records
    summaries/                       # Per-TC status files
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

**~100 of ~242 test cases completed** (59 PASS, 38 FAIL). 7 bugs confirmed (5 from original analysis + 2 new, Bug #6 scope expanded). Testing across three timezones: BRT (UTC-3), IST (UTC+5:30), UTC+0 (GMT). 10 Playwright spec files with 62 test-data entries covering Categories 1, 2, 3, 5, 6, 8, 8B, 9, 9-GDOC, 12. **Cat 1 fully backfilled** (20/20 entries, correct expected values). **Cat 2 fully backfilled** (16/16 entries). Cat 3 (Server Reload) 11/18 (9P, 2F) — includes legacy Config G same-TZ reload. Cat 5 (Preset) 1F (Bug #7 on init path). Cat 6 (Current Date) 2P — only correct init path confirmed. Cat 8 (GFV Return) 5P, 4F — Bug #6 scope expanded to Config C (throws RangeError). Cat 8B (GDOC) 1P. Cat 9 (GFV Round-Trip) 5P, 5F. Cat 9-GDOC 1P (GDOC round-trip stable, matrix prediction corrected). Cat 12 (Edge Cases) 5P, 5F — UTC+0 control confirms Bug #5 drift = TZ offset.

### Files

| File                         | Purpose                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `forms-calendar/analysis.md` | Code review — 5 original bugs + 2 confirmed new bugs. Appendix has extracted source functions. |
| `forms-calendar/results.md`  | Live browser test evidence — source of truth for confirmed behavior.                           |
| `forms-calendar/matrix.md`   | Full test matrix (~242 slots) — authoritative permutation tracker, coverage summary.           |
| `forms-calendar/test-cases/` | Individual TC spec files — one per test scenario, browser-verified before writing.             |
| `forms-calendar/runs/`       | Immutable run files — one per test execution.                                                  |
| `forms-calendar/summaries/`  | Per-TC summary files — current status, run history, interpretation.                            |

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

**Tested in IST (2026-03-30)**: The predicted -2 day double-shift was wrong. Both popup (1-A-IST) and typed input (2-A-IST) store `"2026-03-14"` — single -1 day shift (Bug #7). Bug #2 asymmetry absent for non-legacy configs in IST. Legacy configs (useLegacy=true) store raw `toISOString()` which is a different format entirely — Bug #2 is moot for legacy.

### Test Forms

**Template URL** (creates new form each load):

```
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**Saved record — DateTest-000080 Rev 2** (saved from BRT 2026-03-31, Config A + D set to 03/15/2026):

```
https://vvdemo.visualvault.com/FormViewer/app?DataID=901ce05d-b2f7-42e9-8569-7f9d4caf258d&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**Saved record — DateTest-000084 Rev 1** (saved from IST 2026-04-01, Config A + D set to 03/15/2026):

```
https://vvdemo.visualvault.com/FormViewer/app?DataID=28e371b7-e4e2-456a-94ab-95105ad97d0e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**Old saved record — DateTest-000004 Rev 1** (saved from BRT, used in early tests — prefer DateTest-000080):

```
https://vvdemo.visualvault.com/FormViewer/app?DataID=2ae985b5-1892-4d26-94da-388121b0907e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

### Test Form Fields

Full harness: 8 configs × 3 initial-value modes. DataField3 (duplicate of DataField1) and DataField4 (duplicate of DataField2) exist on the form but are not used in formal test cases. DataField8/9 do not exist (naming gap from 7 to 10).

**No initial value** — base fields for user-input and API tests (Categories 1–4, 7–12)

| Field       | Config | enableTime | ignoreTZ | useLegacy | Purpose                             |
| ----------- | :----: | :--------: | :------: | :-------: | ----------------------------------- |
| DataField7  |   A    |    OFF     |   OFF    |    OFF    | Date-only baseline (Bug #7 in UTC+) |
| DataField10 |   B    |    OFF     |    ON    |    OFF    | Date-only + ignoreTZ                |
| DataField6  |   C    |     ON     |   OFF    |    OFF    | DateTime UTC — control              |
| DataField5  |   D    |     ON     |    ON    |    OFF    | **Bug #5/#6 surface**               |
| DataField12 |   E    |    OFF     |   OFF    |    ON     | Legacy date-only                    |
| DataField11 |   F    |    OFF     |    ON    |    ON     | Legacy date-only + ignoreTZ         |
| DataField14 |   G    |     ON     |   OFF    |    ON     | Legacy DateTime                     |
| DataField13 |   H    |     ON     |    ON    |    ON     | Legacy DateTime + ignoreTZ          |

**Preset date initial value** — for Category 5 tests

| Field       | Config | enableTime | ignoreTZ | useLegacy | Notes                        |
| ----------- | :----: | :--------: | :------: | :-------: | ---------------------------- |
| DataField2  |   A    |    OFF     |   OFF    |    OFF    | Preset 3/1/2026              |
| DataField27 |   B    |    OFF     |    ON    |    OFF    | Preset 3/1/2026 + ignoreTZ   |
| DataField15 |   C    |     ON     |   OFF    |    OFF    | Preset DateTime              |
| DataField16 |   D    |     ON     |    ON    |    OFF    | Preset DateTime + ignoreTZ   |
| DataField19 |   E    |    OFF     |   OFF    |    ON     | Legacy preset date-only      |
| DataField20 |   F    |    OFF     |    ON    |    ON     | Legacy preset date-only + TZ |
| DataField21 |   G    |     ON     |   OFF    |    ON     | Legacy preset DateTime       |
| DataField22 |   H    |     ON     |    ON    |    ON     | Legacy preset DateTime + TZ  |

**Current Date initial value** — for Category 6 tests

| Field       | Config | enableTime | ignoreTZ | useLegacy | Notes                            |
| ----------- | :----: | :--------: | :------: | :-------: | -------------------------------- |
| DataField1  |   A    |    OFF     |   OFF    |    OFF    | Current Date                     |
| DataField28 |   B    |    OFF     |    ON    |    OFF    | Current Date + ignoreTZ          |
| DataField17 |   C    |     ON     |   OFF    |    OFF    | Current Date DateTime            |
| DataField18 |   D    |     ON     |    ON    |    OFF    | Current Date DateTime + ignoreTZ |
| DataField23 |   E    |    OFF     |   OFF    |    ON     | Legacy current date-only         |
| DataField24 |   F    |    OFF     |    ON    |    ON     | Legacy current date-only + TZ    |
| DataField25 |   G    |     ON     |   OFF    |    ON     | Legacy current DateTime          |
| DataField26 |   H    |     ON     |    ON    |    ON     | Legacy current DateTime + TZ     |

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
    sudo systemsetup -settimezone GMT                 # UTC+0 — always UTC+0, no DST
    # WARNING: Europe/London is NOT equivalent to UTC+0 — it observes BST (UTC+1) from
    # late March through October. UK clocks move forward last Sunday of March.
    # Use GMT (or Africa/Abidjan, Africa/Accra) for a fixed UTC+0 zone.
    # Also: 'UTC' and 'Etc/UTC' are NOT valid timezone names for systemsetup on macOS.
    ```
- Verify active timezone in browser: `new Date().toString()` — check the GMT offset

### What Has NOT Been Tested (Forms)

- `useUpdatedCalendarValueLogic=true` — V2 code path never exercised; flag confirmed `false` via live `CalendarValueService` instance scan (`__ngContext__` approach) on 2026-03-30. Re-verify if testing on a different account or with `?ObjectID=` URL param.
- **V1 load path Bug #7 in IST** — `initCalendarValueV1` uses `moment(e).toDate()` for saved data and preset dates; UTC+ users should get wrong day on form load; code-confirmed but no live test (DateTest-000009 was not saved)
- URL parameter input — needs `enableQListener=true` fields
- Web service / scheduled script input — needs server-side execution (Category 10)
- Preset/Current Date with `enableTime=true` fields — needs new test form fields
- Save from IST timezone, reload from BRT (Category 3-D-IST-BRT) — **DONE** (DateTest-000084, saved 2026-04-01 from IST)
- Category 2 legacy typed input (E–H) across all TZs — popup is complete, typed input pending

### Next Steps (Forms)

1. **Category 2 — Typed Input legacy (E–H)**: Calendar popup is fully characterized; typed input for legacy configs is next across BRT, IST, UTC+0.
2. **Category 10 — Web service input**: How production scripts set dates. Write a Node.js test script.
3. **Category 3-D-IST-BRT**: Save a record from IST, switch back to BRT, reload and observe.
4. **Category 5/6 — Preset/Current Date on DateTime fields**: Requires new test form fields with `enableTime=true` + initial value configuration.
5. **Category 4 — URL parameters**: Requires `enableQListener=true` fields.

See `forms-calendar/matrix.md` for the full ~242-slot test matrix. See `forms-calendar/results.md` for archived session results and new run index.
