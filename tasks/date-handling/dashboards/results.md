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
