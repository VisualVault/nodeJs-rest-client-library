# Dashboards — Test Evidence

Live test evidence for the dashboard date display investigation.

Last updated: 2026-04-02

---

## Exploratory Session — 2026-04-02

**Environment**: Playwright headless Chrome, auth via `auth-state-pw.json`
**Dashboard**: `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25`

### Exploration v1 — Grid Structure

- Telerik RadGrid identified (`.RadGrid`, `.rgMasterTable`, `.rgRow`, `.rgAltRow`)
- 33 columns, 65 HTML tables total (RadGrid nests tables)
- 267 records across 2 pages, page size 200
- No Kendo, no ag-grid, no iframes

### Exploration v2 — Date Values

150 records with date values captured on page 1. Key observations:

**Field7 (Config A — date-only, enableTime=false, ignoreTZ=false):**

- DateTest-001071: `3/15/2026` ✓
- DateTest-001070: `4/14/2026` (expected 4/15 — Bug #7)
- DateTest-001062: `4/14/2026` (Bug #7)
- DateTest-001058: `3/14/2026` (expected 3/15 — Bug #7)

**Field6 (Config C — DateTime, enableTime=true, ignoreTZ=false):**

- DateTest-001055: `3/14/2026 12:00 AM` (wrong date)
- DateTest-001054: `4/14/2026 12:00 AM` (wrong date)
- DateTest-001050: `3/15/2026 3:00 AM` (correct date, BRT midnight in UTC)
- DateTest-001048: `3/15/2026 12:00 AM` (correct date, UTC midnight)

**Field5 (Config D — DateTime, enableTime=true, ignoreTZ=true):**

- DateTest-001073: `3/15/2026 2:00 AM`
- DateTest-001072: `3/15/2026 12:00 AM`

### Exploration v3 — TZ Comparison

Two records compared across BRT and IST browser timezones:

**DateTest-000472 (all 28 fields populated):** BRT ≡ IST on all fields (19/19 non-empty fields matched exactly)
**DateTest-000471 (all 28 fields populated):** BRT ≡ IST on all fields (19/19 matched)

**Conclusion**: Dashboard is server-rendered — browser timezone has zero effect.

### Screenshots

- `testing/tmp/screenshots/dashboard-full.png` — Full page screenshot
- `testing/tmp/screenshots/dashboard-v2.png` — V2 exploration
- `testing/tmp/screenshots/dashboard-search.png` — Search toolbar visible

---

## DB-1 Batch Run — 2026-04-02

**Environment**: Playwright headless Chrome, auth via `auth-state-pw.json`
**Method**: `explore-dashboard.js` grid capture + per-field format verification
**Records**: 267 total, 200 on page 1

- 2026-04-02 [TC-DB-1-A Run 1](runs/tc-db-1-A-run-1.md) — PASS — Field7 date-only M/D/YYYY confirmed
- 2026-04-02 [TC-DB-1-B Run 1](runs/tc-db-1-B-run-1.md) — PASS — Field10 date-only+ignoreTZ M/D/YYYY confirmed
- 2026-04-02 [TC-DB-1-C Run 1](runs/tc-db-1-C-run-1.md) — PASS — Field6 DateTime M/D/YYYY H:MM AM/PM confirmed
- 2026-04-02 [TC-DB-1-D Run 1](runs/tc-db-1-D-run-1.md) — PASS — Field5 DateTime+ignoreTZ M/D/YYYY H:MM AM/PM confirmed
- 2026-04-02 [TC-DB-1-E Run 1](runs/tc-db-1-E-run-1.md) — PASS — Field12 legacy date-only M/D/YYYY confirmed
- 2026-04-02 [TC-DB-1-F Run 1](runs/tc-db-1-F-run-1.md) — PASS — Field11 legacy date-only+ignoreTZ M/D/YYYY confirmed
- 2026-04-02 [TC-DB-1-G Run 1](runs/tc-db-1-G-run-1.md) — PASS — Field14 legacy DateTime M/D/YYYY H:MM AM/PM confirmed
- 2026-04-02 [TC-DB-1-H Run 1](runs/tc-db-1-H-run-1.md) — PASS — Field13 legacy DateTime+ignoreTZ M/D/YYYY H:MM AM/PM confirmed

**Key finding**: Server-side display format is determined solely by `enableTime`. The `ignoreTZ` and `useLegacy` flags have zero effect on dashboard rendering.
