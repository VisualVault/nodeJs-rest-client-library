# Date Handling — Cross-Platform Bug Investigation

## What This Is

Comprehensive investigation of date handling defects across **all VisualVault components** — not just Forms. The goal is to find, test, and document every date-related bug in the platform, covering how dates are stored, transformed, displayed, and exchanged between components.

## Scope

| Component                                | Status                                                   | Folder                     |
| ---------------------------------------- | -------------------------------------------------------- | -------------------------- |
| **Forms — Calendar Fields**              | IN PROGRESS (~216/242 tests done, 250 test-data entries) | `forms-calendar/`          |
| **Web Services (REST API)**              | COMPLETE (148/148 — 116P/32F, 10 categories)             | `web-services/`            |
| **Analytic Dashboards**                  | COMPLETE (44/44 tests done)                              | `dashboards/`              |
| **VisualVault Reports**                  | NOT STARTED                                              | `reports/` (to create)     |
| **Files (document dates)**               | NOT STARTED                                              | `files/` (to create)       |
| **Workflows (date triggers, deadlines)** | NOT STARTED                                              | `workflows/` (to create)   |
| **Node.js Client Library**               | NOT STARTED                                              | `node-client/` (to create) |

## Folder Structure

```
tasks/date-handling/
  CLAUDE.md                          # This file — overall context
  analysis/                          # Cross-cutting root cause analysis
    temporal-models.md               # Root cause analysis — 14 bugs, 4 temporal models, architectural limitations
    fix-strategy.md                  # Fix categories per model, design decisions, traps to avoid
  forms-calendar/                    # Forms calendar field investigation
    analysis/                        # Analysis & conclusions
      overview.md                    # Executive summary, confirmed bugs, code paths, V1/V2 comparison
      bug-{1-7}.md                   # Individual bug documents (FORM-BUG-1 through FORM-BUG-7)
      bug-{1-7}-fix-recommendations.md  # Companion docs (workarounds, proposed fixes, impact)
    results.md                       # Live browser test evidence (source of truth)
  web-services/                      # REST API date handling investigation
    README.md                        # Test environment setup, harness usage, architecture
    analysis/                        # Analysis & conclusions
      overview.md                    # Executive summary, issues registry, confirmed behaviors, developer guidance
      ws-bug-{1-6}.md               # Individual bug documents (WEBSERVICE-BUG-1 through WEBSERVICE-BUG-6)
      ws-bug-{1-6}-fix-recommendations.md  # Companion docs (workarounds, proposed fixes, impact)
    matrix.md                        # Test matrix — WS-1 through WS-10 categories (148 slots, complete)
    results.md                       # Live test evidence
    test-cases/                      # Individual TC spec files
    runs/                            # Immutable execution records
    summaries/                       # Per-TC status files
  dashboards/                        # Dashboard date display investigation (COMPLETE — 44/44)
    analysis/                        # Analysis & conclusions
      overview.md                    # Architecture, confirmed behaviors, design observations, test coverage
      formdashboard-bug-1-format-inconsistency.md      # FORMDASHBOARD-BUG-1: .NET vs Angular format mismatch
      formdashboard-bug-1-fix-recommendations.md       # Companion doc (workarounds, proposed fix, impact)
    matrix.md                        # Test matrix — DB-1 through DB-8 (44 slots, complete)
    results.md                       # Live test evidence
    test-cases/                      # Individual TC spec files
    runs/                            # Immutable execution records
    summaries/                       # Per-TC status files
  reports/                           # (future) VV Reports date filtering/display
  files/                             # (future) Document date metadata
  workflows/                         # (future) Workflow date triggers
  node-client/                       # (future) Node.js client library date handling
```

## Database Schema (Confirmed 2026-04-06)

**Table**: `dbo.DateTest` — ALL calendar fields are SQL Server `datetime` type (no `date` type). This means JavaScript format differences (date-only string vs UTC datetime) translate to actual data differences in the DB.

**VV server timezone**: BRT (UTC-3) — confirmed by 3-hour offset between `VVCreateDate` (server local) and Field1 `toISOString()` (UTC).

**Mixed timezone storage**: The same `datetime` column contains BOTH UTC values (from `toISOString()`) and timezone-ambiguous local values (from `getSaveValue()`). SQL queries cannot reliably filter by date without knowing which code path stored the value. See DB Evidence sections in `analysis/bug-2-inconsistent-handlers.md` and `analysis/bug-3-hardcoded-params.md`.

**API vs browser write paths (Cat 13, 2026-04-08)**: The REST API write path (`postForms`) stores dates **uniformly** for all field configs — no Config C/D divergence, no FORM-BUG-7. The mixed timezone storage is exclusively a **Forms Angular save pipeline issue**. Developers using the REST API to write dates get consistent storage. See `forms-calendar/analysis/overview.md` § "API Write Path Stores Uniformly".

**Bug #5 drift persists to DB (Cat 13, 2026-04-08)**: Round-trip drift from FORM-BUG-5 is not transient — it saves to the database. 1 BRT round-trip stores `-3h` drift; 8 round-trips store `-24h` (full day lost). Records: DateTest-001919 (1 trip), DateTest-001920 (8 trips).

## Cross-Cutting Questions

1. **Storage format**: **ANSWERED** — All `datetime` in SQL Server. No `date` type. Mixed UTC/local values in same column depending on code path.
2. **Timezone handling**: **ANSWERED** — Each component handles timezones differently. Users in different TZs accessing same data see different values for date-only fields (FORM-BUG-7). Config D (DateTime+ignoreTZ) is TZ-independent.
3. **API contract**: **ANSWERED** — REST API accepts date strings and stores as-is (uniform). API returns stored values with Z suffix (serialization artifact). API write path bypasses Forms getSaveValue() — no config-specific transformation.
4. **Round-trip integrity**: **ANSWERED** — No. Forms GFV→SFV round-trip drifts by TZ offset per cycle (FORM-BUG-5). API read→API write is safe (no transformation). GDOC→SFV is safe. Drift persists to DB.
5. **Query/filter behavior**: **ANSWERED** — Query engine is correct but returns inconsistent results when data was entered from different TZs (FORM-BUG-7 stores wrong date for UTC+ users). See Cat 13: tc-13-query-consistency.
6. **Developer API consistency**: **ANSWERED** — No. GetFieldValue adds fake Z (FORM-BUG-5), SetFieldValue parses date-only as local midnight (FORM-BUG-7), REST API returns stored value with real Z. All three use different formats for the same stored value.

---

## Forms Calendar Fields (Current Focus)

### Progress

**~220 of ~246 test cases completed**. 7 bugs confirmed (5 from original analysis + 2 new, FORM-BUG-6 scope expanded). Testing across five timezones: BRT (UTC-3), IST (UTC+5:30), UTC+0 (GMT), PST (UTC-8/UTC-7), JST (UTC+9). 16 Playwright spec files with 254 test-data entries covering Categories 1, 1-legacy-popup, 2, 3, 4 (URL params + FillinAndRelate + reload), 5, 6, 7, 8, 8B, 9, 9-GDOC, 11, 12. **Cat 4 fully complete** 36/36 (36P, 0F) — 27 direct URL param + 9 FillinAndRelate chain tests; TargetDateTest form (`enableQListener=true`); date-only immune to FORM-BUG-7 via URL path; FORM-BUG-1 confirmed on all DateTime configs in V1; `.000` ms residue from FORM-BUG-5 causes V8 UTC parsing (bugs compound, not cancel, in D→D chains). **Cat 1 fully backfilled** (20/20 entries). **Cat 2 fully backfilled** (16/16 entries). **Cat 3 fully complete** 18/18 (10P, 8F — corrected from 14P/4F per Playwright audit 2026-04-06; legacy E/F/H added, B-IST-BRT closes category). **Cat 5 fully complete** 18/18 (11P, 7F) — 17 test-data entries; FORM-BUG-7 on all date-only presets in IST, FORM-BUG-5 on Config D presets (invisible at UTC0), legacy configs E-H safe from FORM-BUG-5 (useLegacy=true bypasses fake Z), Config C presets TZ-independent. **Cat 6 fully complete** 15/15 (13P, 2F) — 14 test-data entries; Current Date uses `new Date()` directly → no FORM-BUG-7; FORM-BUG-5 only on non-legacy Config D; all legacy configs pass; cross-midnight edge demonstrated in IST. Cat 7 (SFV Formats) 39 entries across all 8 configs × 2 TZs, 39/39 done (23P, 16F) — all Config D BRT/IST formats tested; all date-only configs (A/B/E/F) tested BRT+IST; **Config C fully tested (7 formats) — Config C is format-agnostic for all local-midnight inputs**; legacy DateTime (G/H) BRT done; **key finding: useLegacy=true bypasses FORM-BUG-5 fake Z on GFV, but does NOT protect date-only fields from FORM-BUG-7**. Cat 8 (GFV Return) 19 entries (13P, 6F) — all 8 configs tested; FORM-BUG-5 on Config D all TZs; FORM-BUG-6 on empty Config C/D; **legacy DateTime (G/H) returns raw (not UTC) — 8-G-BRT prediction corrected**; V2 code path bypasses all GFV transformations (FORM-BUG-5 absent under V2); FORM-BUG-5 invisible at UTC+0. **Cat 8B (GDOC) complete** 12 entries (11P, 1F) — GDOC returns correct Date for all configs; 8B-A-IST FAIL is FORM-BUG-7 upstream (not GDOC fault); empty fields return undefined (falsy, safe). **Cat 9 (GFV Round-Trip) complete** 20 entries (9P, 11F) — FORM-BUG-5 drift proportional to TZ offset: BRT -3h, IST +5:30h, PST/PDT -7h, JST +9h, UTC0 0h (coincidental); **9-B-IST reveals FORM-BUG-7 causes -1 day/trip on date-only round-trips in UTC+**; PST corrected to PDT (-7h, DST active Mar 15); legacy configs (E, G, H) stable. **Cat 9-GDOC complete** 5/5 (4P, 1F) — GDOC round-trip safe for DateTime configs (D-BRT, D-IST, C-BRT, A-BRT all 0 drift); **A-IST FAIL: double FORM-BUG-7 compound shift** (-3 days from Mar 15 to Mar 12) — GDOC itself returns correct Date but `.toISOString()` → SFV triggers BUG-7 on the UTC date portion twice; GDOC round-trip **UNSAFE for date-only fields in UTC+**. **Cat 11 (Cross-Timezone)** 16 spec file, 16 of 18 done (11P, 6F, 1 PENDING) — **key finding: cross-TZ form LOAD does NOT introduce corruption** (raw values survive BRT↔IST, BRT→UTC0, BRT→PDT, BRT→JST unchanged); FORM-BUG-7 fires at input/save time, NOT load time; 4 matrix predictions corrected; **compound drift confirmed and commutative**: BRT→IST and IST→BRT both produce +2:30h net (TC-11-roundtrip-cross, TC-11-D-concurrent-IST-edit, TC-11-concurrent-edit); BRT-first crosses day boundary in intermediate state; Bug #5 TZ spectrum complete: BRT -3h, PDT -7h, PST -8h (DST day), UTC0 0h, IST +5:30h, JST +9h; DST spring-forward anomaly: V8 advances 2AM→3AM, round-trip crosses day+DST boundary; Config H (useLegacy=true) 0 drift after 3 trips; **BRT→IST fully covered for all 8 configs** (A-H): all raw values preserved, only Config D GFV shows FORM-BUG-5 fake Z, all 4 legacy configs (E-H) PASS. Cat 12 (Edge Cases) 20 entries (3P, 16F, 0 PENDING, 1 SKIP) — **fully complete**; near-midnight, year/leap boundary, DST (including US PST spring-forward), empty/null/invalid, far-future, pre-epoch; IST shows opposite drift direction; Bug #6 scope fully mapped (C throws RangeError, D returns "Invalid Date", null=same as "", A immune, useLegacy safe). **Cat 13 (Database) fully complete** 10/10 (4P, 6F) — verified via REST API reads (`run-ws-test.js --action WS-2`) instead of direct SQL; **key finding: API write path (`postForms`) stores dates uniformly for all configs — no C/D divergence, no FORM-BUG-7; mixed timezone storage is exclusively a Forms Angular `getSaveValue()` pipeline issue**; Config B = Config A (ignoreTZ no effect on date-only); Bug #5 drift persists to DB (-3h after 1 trip, -24h after 8 trips = full day lost); IST Config A stores Mar 14 instead of Mar 15 (BUG-7 visible in DB); date queries miss IST records; preset stores UTC (T03:00 for BRT), user-input stores local (T00:00) in same record; all 6 cross-cutting questions now answered.

### Files

| File                         | Purpose                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `forms-calendar/analysis/`   | Analysis & conclusions — overview + 7 individual bug documents (bug-1 through bug-7). |
| `forms-calendar/results.md`  | Live browser test evidence — source of truth for confirmed behavior.                  |
| `forms-calendar/matrix.md`   | Full test matrix (~242 slots) — authoritative permutation tracker, coverage summary.  |
| `forms-calendar/test-cases/` | Individual TC spec files — one per test scenario, browser-verified before writing.    |
| `forms-calendar/runs/`       | Immutable run files — one per test execution.                                         |
| `forms-calendar/summaries/`  | Per-TC summary files — current status, run history, interpretation.                   |

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
V2 partially fixes FORM-BUG-7 for date-only fields by routing through `parseDateString()` which uses `.tz("UTC",true).local()` (treats the parsed time as UTC before converting to local). However, for `ignoreTimezone=true` date-only fields, V2 still falls through to plain `moment(stripped).toDate()` — **FORM-BUG-7 persists in V2 for those fields.**

**V1 FORM-BUG-7 scope is wider than SetFieldValue:**
In V1, every code path that handles a date-only string ends at `moment(e).toDate()` — not just `normalizeCalValue()`. This includes the form load path in `initCalendarValueV1` (lines ~102886–102931): saved data, URL parameter input, and preset initial values all parse via local midnight. UTC+ users see the wrong day on form load, before any `SetFieldValue` is called.

| Scenario                         | V1                                                                | V2                                                                               |
| -------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| DateTime, ignoreTZ=false — load  | `new Date(value)` — Z preserved, correct                          | `parseDateString()` → strips Z → `.tz("UTC",true).local()`                       |
| DateTime, ignoreTZ=true — load   | Strip Z → `new Date(e)` → local parse                             | Strip Z → `moment(stripped)` → local (same as V1)                                |
| Date-only, ignoreTZ=false — load | Strip T → `moment(e).toDate()` → **FORM-BUG-7**                   | Strip T → `parseDateString()` → UTC → **fixed**                                  |
| Date-only, ignoreTZ=true — load  | Strip T → `moment(e).toDate()` → **FORM-BUG-7**                   | Strip T → `moment(stripped)` → **FORM-BUG-7 persists**                           |
| Preset date (date-only)          | `moment(initialDate).toDate()` → **FORM-BUG-7**                   | `parseDateString()` path → fixed for non-ignoreTZ                                |
| SetFieldValue (date-only)        | `normalizeCalValue()` → `moment(input).toDate()` → **FORM-BUG-7** | `normalizeCalValue()` checks flag → `parseDateString()` → fixed for non-ignoreTZ |

### Confirmed Code Paths (main.js line references)

**SetFieldValue path:**

```
VV.Form.SetFieldValue()
  → SetFieldValueInternal()          sets raw value in partition + sends component message
  → applyCalChange()                 component receives message
  → normalizeCalValue()  ~102793     converts input to a Date object (FORM-BUG-7 lives here)
  → calChange()          ~102824     calls toISOString() + getSaveValue()
  → getSaveValue()       ~104100     strips Z and formats for storage
  → updateFormValueSubject()         stores final value
```

**GetFieldValue path:**

```
VV.Form.GetFieldValue()
  → getValueObjectValue()            reads raw stored value
  → getCalendarFieldValue()  104114  applies output transformation (FORM-BUG-5, FORM-BUG-6 live here)
```

**Form load path (V1 — default):**

```
initCalendarValueV1()    ~102886
  → parseDateString()    ~104126    strips Z, re-parses as local (FORM-BUG-1 lives here)
  → getSaveValue()       ~104100    strips Z and formats for storage
  → setValueObjectValueByName()     stores final value
```

**Shared service functions:**

- `parseDateString()` — line 104126
- `getSaveValue()` — line 104100
- `getCalendarFieldValue()` — line 104114
- `normalizeCalValue()` — line ~102793

### Confirmed Bugs

**FORM-BUG-5 — Fake [Z] in GetFieldValue (HIGH SEVERITY)**

`getCalendarFieldValue()` adds a literal `[Z]` to local time values when `enableTime=true && ignoreTimezone=true && !useLegacy`. Causes progressive date drift on every `SetFieldValue(GetFieldValue())` round-trip:

- UTC-3 (São Paulo): -3h per trip, full day lost after 8 trips; **year boundary crossed in 1 trip from Jan 1 midnight**
- UTC+5:30 (Mumbai): +5:30h per trip, full day gained after ~4.4 trips
- UTC+0 (London): no drift (fake Z happens to be correct)

**Only affects**: `enableTime=true` + `ignoreTimezone=true` + `useLegacy=false`

---

**FORM-BUG-6 — GetFieldValue returns `"Invalid Date"` string for empty Config D fields (MEDIUM)**

When a `enableTime=true && ignoreTimezone=true` field is cleared (set via `""` or `null`):

- `getValueObjectValue()` correctly returns `""`
- `GetFieldValue()` returns the string `"Invalid Date"` — which is **truthy**
- `if (VV.Form.GetFieldValue('field'))` evaluates `true` for an empty field

---

**FORM-BUG-7 — SetFieldValue on date-only fields stores wrong day for UTC+ timezones (HIGH SEVERITY)**

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

**FORM-BUG-2 — Inconsistent Handlers (NOT REPRODUCED with useLegacy=false in BRT)**

With `useLegacy=false` in BRT, popup and typed input produce identical values. May only exist with `useLegacy=true` (no access to test).

**Tested in IST (2026-03-30)**: The predicted -2 day double-shift was wrong. Both popup (1-A-IST) and typed input (2-A-IST) store `"2026-03-14"` — single -1 day shift (FORM-BUG-7). FORM-BUG-2 asymmetry absent for non-legacy configs in IST. Legacy configs (useLegacy=true) store raw `toISOString()` which is a different format entirely — FORM-BUG-2 is moot for legacy.

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

Full harness: 8 configs × 3 initial-value modes. Field3 (duplicate of Field1) and Field4 (duplicate of Field2) exist on the form but are not used in formal test cases. Field8/9 do not exist (naming gap from 7 to 10).

**No initial value** — base fields for user-input and API tests (Categories 1–4, 7–12)

| Field   | Config | enableTime | ignoreTZ | useLegacy | Purpose                                 |
| ------- | :----: | :--------: | :------: | :-------: | --------------------------------------- |
| Field7  |   A    |    OFF     |   OFF    |    OFF    | Date-only baseline (FORM-BUG-7 in UTC+) |
| Field10 |   B    |    OFF     |    ON    |    OFF    | Date-only + ignoreTZ                    |
| Field6  |   C    |     ON     |   OFF    |    OFF    | DateTime UTC — control                  |
| Field5  |   D    |     ON     |    ON    |    OFF    | **FORM-BUG-5/#6 surface**               |
| Field12 |   E    |    OFF     |   OFF    |    ON     | Legacy date-only                        |
| Field11 |   F    |    OFF     |    ON    |    ON     | Legacy date-only + ignoreTZ             |
| Field14 |   G    |     ON     |   OFF    |    ON     | Legacy DateTime                         |
| Field13 |   H    |     ON     |    ON    |    ON     | Legacy DateTime + ignoreTZ              |

**Preset date initial value** — for Category 5 tests

| Field   | Config | enableTime | ignoreTZ | useLegacy | Notes                        |
| ------- | :----: | :--------: | :------: | :-------: | ---------------------------- |
| Field2  |   A    |    OFF     |   OFF    |    OFF    | Preset 3/1/2026              |
| Field27 |   B    |    OFF     |    ON    |    OFF    | Preset 3/1/2026 + ignoreTZ   |
| Field15 |   C    |     ON     |   OFF    |    OFF    | Preset DateTime              |
| Field16 |   D    |     ON     |    ON    |    OFF    | Preset DateTime + ignoreTZ   |
| Field19 |   E    |    OFF     |   OFF    |    ON     | Legacy preset date-only      |
| Field20 |   F    |    OFF     |    ON    |    ON     | Legacy preset date-only + TZ |
| Field21 |   G    |     ON     |   OFF    |    ON     | Legacy preset DateTime       |
| Field22 |   H    |     ON     |    ON    |    ON     | Legacy preset DateTime + TZ  |

**Current Date initial value** — for Category 6 tests

| Field   | Config | enableTime | ignoreTZ | useLegacy | Notes                            |
| ------- | :----: | :--------: | :------: | :-------: | -------------------------------- |
| Field1  |   A    |    OFF     |   OFF    |    OFF    | Current Date                     |
| Field28 |   B    |    OFF     |    ON    |    OFF    | Current Date + ignoreTZ          |
| Field17 |   C    |     ON     |   OFF    |    OFF    | Current Date DateTime            |
| Field18 |   D    |     ON     |    ON    |    OFF    | Current Date DateTime + ignoreTZ |
| Field23 |   E    |    OFF     |   OFF    |    ON     | Legacy current date-only         |
| Field24 |   F    |    OFF     |    ON    |    ON     | Legacy current date-only + TZ    |
| Field25 |   G    |     ON     |   OFF    |    ON     | Legacy current DateTime          |
| Field26 |   H    |     ON     |    ON    |    ON     | Legacy current DateTime + TZ     |

### Key JavaScript for Inspecting Field State

```javascript
VV.Form.VV.FormPartition.fieldMaster; // field definitions (keyed by GUID)
VV.Form.VV.FormPartition.getValueObjectValue('Field5'); // raw stored value
VV.Form.GetFieldValue('Field5'); // processed return (FORM-BUG-5 adds fake Z)
VV.Form.SetFieldValue('Field5', value); // set value (goes through normalizeCalValue)
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
- **V1 load path FORM-BUG-7 in IST** — `initCalendarValueV1` uses `moment(e).toDate()` for saved data and preset dates; UTC+ users should get wrong day on form load; code-confirmed but no live test (DateTest-000009 was not saved)
- ~~URL parameter input — needs `enableQListener=true` fields~~ **DONE** (Cat 4: 36/36 PASS, TargetDateTest form, 2026-04-08)
- Web service / scheduled script input — needs server-side execution (Category 10)
- Preset/Current Date with `enableTime=true` fields — needs new test form fields
- Save from IST timezone, reload from BRT (Category 3-D-IST-BRT) — **DONE** (DateTest-000084, saved 2026-04-01 from IST)
- Category 2 legacy typed input (E–H) across all TZs — popup is complete, typed input pending

### Next Steps (Forms)

1. **Category 2 — Typed Input legacy (E–H)**: Calendar popup is fully characterized; typed input for legacy configs is next across BRT, IST, UTC+0.
2. **Category 10 — Web service input**: How production scripts set dates. Write a Node.js test script.
3. **Category 3-D-IST-BRT**: Save a record from IST, switch back to BRT, reload and observe.
4. **Category 5/6 — Preset/Current Date on DateTime fields**: Requires new test form fields with `enableTime=true` + initial value configuration.
5. ~~**Category 4 — URL parameters**~~: **COMPLETE** (36/36 PASS, 2026-04-08). TargetDateTest form with `enableQListener=true`. Key findings: date-only immune to FORM-BUG-7 via URL path; `.000` ms residue from FORM-BUG-5 causes UTC parsing in V8 (bugs compound in FillinAndRelate chains).

See `forms-calendar/matrix.md` for the full ~242-slot test matrix. See `forms-calendar/results.md` for archived session results and new run index.
