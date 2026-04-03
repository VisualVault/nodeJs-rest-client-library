# Dashboards — Date Display Investigation

How dates appear in VisualVault's Analytic Dashboards (Telerik RadGrid, server-side rendered).

**Dashboard URL**: `https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25`

Analysis → `analysis.md` | Test matrix → `matrix.md` | Evidence → `results.md`

---

## Architecture

Dashboards use **Telerik RadGrid** (ASP.NET WebForms, server-rendered). Unlike Forms (Angular SPA with client-side JS), the dashboard renders dates entirely on the server — the browser timezone has **no effect** on displayed values. BRT and IST users see identical date strings for the same record.

This means:

- **No client-side calendar/moment.js bugs** (Bug #5, #6 are not applicable here)
- **Bug #7 is visible** — wrong dates stored in the DB surface directly in the grid
- **Mixed timezone storage** is visible — same intended date shows different time components depending on write source

---

## Grid Structure

| Property       | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| Grid component | Telerik RadGrid (`.RadGrid`, `.rgMasterTable`)               |
| Total records  | 272 (as of 2026-04-02)                                       |
| Pages          | 2 (page size 200)                                            |
| Columns        | 33 (Form ID + 28 date fields + 4 WS fields + pager)          |
| Column sort    | All columns sortable via header click (`.GridHeaderLink`)    |
| Filters        | SQL filter builder (`.ctrlFilter`, `.FilterButtonAddRemove`) |
| Export         | Excel, Word, XML                                             |
| Record click   | `__doPostBack` opens record detail (server postback)         |

### Column Order (alphabetical by field name)

```
Form ID, Field1, Field10, Field11, Field12, Field13, Field14, Field15, Field16,
Field17, Field18, Field19, Field2, Field20, Field21, Field22, Field23, Field24,
Field25, Field26, Field27, Field28, Field3, Field4, Field5, Field6, Field7,
WSAction, WSConfigs, WSInputDate, WSRecordID, WSResult
```

Note: columns are sorted alphabetically (Field1, Field10, Field11...), not numerically.

### DOM Selectors

| Element                | Selector                                                          |
| ---------------------- | ----------------------------------------------------------------- |
| Header row             | `.rgMasterTable thead th`                                         |
| Header link (sortable) | `.GridHeaderLink`                                                 |
| Data rows              | `.rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow` |
| Data cells             | `td` within data rows                                             |
| Pager                  | `.rgPagerCell`                                                    |
| Page size combo        | `input[id*="PageSizeComboBox"]`                                   |
| Search toggle          | `a[title="Toggle search toolbar display"]`                        |
| Filter area            | `.ctrlFilter`, `.FilterDisplayOuterDiv`                           |
| Print button           | `a[title="Print"]`                                                |
| Export button          | `a[title="Export the report"]`                                    |

---

## Date Display Formats

The server formats dates based on the field's `enableTime` flag:

|   Config   | enableTime | Display Format        | Example             |
| :--------: | :--------: | --------------------- | ------------------- |
| A, B, E, F |   false    | `M/D/YYYY`            | `3/15/2026`         |
| C, D, G, H |    true    | `M/D/YYYY H:MM AM/PM` | `3/15/2026 3:00 AM` |

The `ignoreTZ` and `useLegacy` flags do **not** affect the dashboard display format — only `enableTime` matters for the server-side formatter.

---

## Prerequisites

1. **Auth state**: Run `npx playwright test --project BRT-chromium` (or global-setup) to generate `testing/config/auth-state-pw.json`
2. **Playwright**: `npm install` (already includes `@playwright/test`)

---

## Test Execution

### Exploration script

```bash
node tasks/date-handling/dashboards/explore-dashboard.js
```

### Category-specific test scripts

```bash
node tasks/date-handling/dashboards/test-sort-v4.js --field Field7      # DB-4: column sort
node tasks/date-handling/dashboards/test-filter-v3.js --batch           # DB-5: SQL filter
node tasks/date-handling/dashboards/test-cross-layer.js                 # DB-6: dashboard vs form
node tasks/date-handling/dashboards/explore-dashboard.js --compare      # DB-8: TZ independence
```

---

## Files

| File                   | Purpose                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `README.md`            | This file — setup, architecture, selectors                  |
| `analysis.md`          | Server-side rendering analysis, format rules, bug surface   |
| `matrix.md`            | Test matrix — DB-1 through DB-8, 44 slots (41 done, 33P/8F) |
| `results.md`           | Live test evidence — session-indexed run entries            |
| `explore-dashboard.js` | Playwright grid capture + TZ comparison (`--compare`)       |
| `test-sort-v4.js`      | DB-4: column sort test (handles `__doPostBack` strict mode) |
| `test-filter-v3.js`    | DB-5: SQL filter test via hidden `txtSQLFilter` textarea    |
| `test-cross-layer.js`  | DB-6: dashboard vs FormViewer value comparison              |
| `test-cases/`          | Individual TC spec files (immutable after creation)         |
| `runs/`                | Immutable execution records (one per test run)              |
| `summaries/`           | Per-TC status + run history                                 |
