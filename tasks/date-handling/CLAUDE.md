# Date Handling — Cross-Platform Bug Investigation

## What This Is

Comprehensive investigation of date handling defects across **all VisualVault components** — not just Forms. The goal is to find, test, and document every date-related bug in the platform, covering how dates are stored, transformed, displayed, and exchanged between components.

## Scope

| Component | Status | Folder |
|-----------|--------|--------|
| **Forms — Calendar Fields** | IN PROGRESS (~34/104 tests done) | `forms-calendar/` |
| **Web Services (REST API)** | NOT STARTED | `web-services/` (to create) |
| **Analytic Dashboards** | NOT STARTED | `dashboards/` (to create) |
| **VisualVault Reports** | NOT STARTED | `reports/` (to create) |
| **Files (document dates)** | NOT STARTED | `files/` (to create) |
| **Workflows (date triggers, deadlines)** | NOT STARTED | `workflows/` (to create) |
| **Node.js Client Library** | NOT STARTED | `node-client/` (to create) |

## Folder Structure

```
tasks/date-handling/
  CLAUDE.md                          # This file — overall context
  forms-calendar/                    # Forms calendar field investigation
    draft-analysis.md                # Initial code review (DRAFT — treat as hypothesis)
    test-results.md                  # Live browser test evidence
  web-services/                      # (future) REST API date handling
  dashboards/                        # (future) Analytic Dashboard dates
  reports/                           # (future) VV Reports date filtering/display
  files/                             # (future) Document date metadata
  workflows/                         # (future) Workflow date triggers
  node-client/                       # (future) Node.js client library date handling
```

## Cross-Cutting Questions

These questions apply across ALL components, not just Forms:

1. **Storage format**: What format are dates stored in the database? Is it consistent across components?
2. **Timezone handling**: Does each component handle timezones the same way? What happens when users in different timezones access the same data?
3. **API contract**: What format does the REST API accept and return for dates? Is it consistent with what Forms store?
4. **Round-trip integrity**: Can a date be read from one component and written to another without shifting?
5. **Query/filter behavior**: Do date filters in Reports and Dashboards correctly match stored dates considering timezone ambiguity?
6. **Developer API consistency**: Do `GetFieldValue`, `SetFieldValue`, and REST API endpoints return dates in the same format?

---

## Forms Calendar Fields (Current Focus)

### Progress

**~34 of ~104 test cases completed.** The highest-severity bug (Bug #5) is confirmed with live evidence across two timezones. Several claims from the draft analysis were disproved or refined by testing.

### Files

| File | Purpose |
|------|---------|
| `forms-calendar/draft-analysis.md` | Initial code review — identifies 5 potential bugs across 8 scenarios. **DRAFT** — treat as hypothesis to test and challenge. Several claims already disproved. |
| `forms-calendar/test-results.md` | Live browser test evidence — raw data, DB verification, complete test matrix (~104 cases). This is the source of truth for what we've confirmed. |

### Important: Draft Analysis vs Live Evidence

`draft-analysis.md` is based on code review only. Live testing has shown:

- **Some claims are wrong** — e.g., the analysis says `calChangeSetValue()` bypasses `getSaveValue()`, but both paths produce the same format in practice
- **Some bugs don't reproduce** — Bug #2 (inconsistent handlers) was not observed with `useLegacy=false`
- **Some findings are new** — Mixed UTC/local in the DB was not in the original analysis

Always verify analysis claims against live test results before acting on them.

### Confirmed Bugs

**Bug #5 — Fake [Z] in GetFieldValue (HIGH SEVERITY)**

`getCalendarFieldValue()` adds a literal `[Z]` to local time values when `enableTime=true && ignoreTimezone=true && !useLegacy`. Causes progressive date drift on every `SetFieldValue(GetFieldValue())` round-trip:
- UTC-3 (Sao Paulo): -3h per trip, full day lost after 8 trips
- UTC+5:30 (Mumbai): +5:30h per trip, full day gained after ~4 trips
- UTC+0 (London): no drift (fake Z happens to be correct)

**Only affects**: `enableTime=true` + `ignoreTimezone=true` + `useLegacy=false`

**Database Mixed Timezone Storage (NEW)**

Initial value fields store UTC; user-input fields store local time without timezone info. Same logical date has different DB representations depending on code path.

**Bug #2 — Inconsistent Handlers (NOT REPRODUCED)**

With `useLegacy=false`, popup and typed input produce identical values. May only exist with `useLegacy=true` (no access to test).

### Test Form

**Template URL** (creates new form each load):
```
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**Saved record** (DateTest-000004 Rev 1):
```
https://vvdemo.visualvault.com/FormViewer/app?DataID=2ae985b5-1892-4d26-94da-388121b0907e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

### Test Form Fields

| Field | enableTime | ignoreTZ | useLegacy | Config ID | Purpose |
|-------|:---:|:---:|:---:|:---------:|---------|
| DataField1 | OFF | OFF | OFF | A | Current Date default |
| DataField2 | OFF | OFF | OFF | A | Preset 3/1/2026 default |
| DataField3 | OFF | OFF | OFF | A | Current Date default (duplicate) |
| DataField4 | OFF | OFF | OFF | A | Preset 3/1/2026 (duplicate) |
| DataField5 | **ON** | **ON** | OFF | D | **Bug #5 vulnerable** — DateTime + ignoreTZ |
| DataField6 | **ON** | OFF | OFF | C | DateTime, proper UTC — stable control |
| DataField7 | OFF | OFF | OFF | A | Date-only baseline |
| DataField10 | OFF | **ON** | OFF | B | Date-only + ignoreTZ (no effect) |

DataField8/9 do not exist (naming jumped from 7 to 10).

### Key JavaScript for Inspecting Field State

```javascript
VV.Form.VV.FormPartition.fieldMaster                          // all field definitions
VV.Form.VV.FormPartition.getValueObjectValue('DataField5')    // raw stored value
VV.Form.GetFieldValue('DataField5')                           // processed return (Bug #5 adds fake Z here)
VV.Form.SetFieldValue('DataField5', value)                    // set value
```

### Testing Method

Tests run via **Claude-in-Chrome MCP extension** for browser automation. Cross-timezone testing via Chrome DevTools Sensors panel timezone override. Emanuel provides database values by direct DB query.

### What Has NOT Been Tested (Forms)

- `useLegacy=true` — no access to enable
- `useUpdatedCalendarValueLogic=true` — always false in tests
- URL parameter input — needs `enableQListener=true` fields
- Web service / scheduled script input — needs server-side execution
- Preset/Current Date with `enableTime=true` fields

### Next Steps (Forms)

1. Web service input formats — how production scripts set dates
2. SetFieldValue format testing — which string formats are safe
3. URL parameters — needs `enableQListener=true` fields
4. Edge cases — year/day boundaries, DST
5. Legacy config — when `useLegacy=true` access is available

See "Complete Test Matrix" in `forms-calendar/test-results.md` for full ~104 test case list.
