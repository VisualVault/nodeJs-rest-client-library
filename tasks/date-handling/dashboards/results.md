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

---

## DB-2 Batch Run — 2026-04-02

**Environment**: Playwright headless Chrome, `explore-dashboard.js --record`
**Method**: Capture grid cell values for records with known WS stored values, compare
**Records**: DateTest-000889 (date-only A,B,E,F), DateTest-000890 (DateTime C,D,G,H)

- 2026-04-02 [TC-DB-2-A Run 1](runs/tc-db-2-A-run-1.md) — PASS — Field7 `3/15/2026` matches stored `2026-03-15T00:00:00Z`
- 2026-04-02 [TC-DB-2-B Run 1](runs/tc-db-2-B-run-1.md) — PASS — Field10 `3/15/2026` matches stored `2026-03-15T00:00:00Z`
- 2026-04-02 [TC-DB-2-C Run 1](runs/tc-db-2-C-run-1.md) — PASS — Field6 `3/15/2026 2:30 PM` matches stored `2026-03-15T14:30:00Z`
- 2026-04-02 [TC-DB-2-D Run 1](runs/tc-db-2-D-run-1.md) — PASS — Field5 `3/15/2026 2:30 PM` matches stored `2026-03-15T14:30:00Z`
- 2026-04-02 [TC-DB-2-E Run 1](runs/tc-db-2-E-run-1.md) — PASS — Field12 `3/15/2026` matches stored `2026-03-15T00:00:00Z`
- 2026-04-02 [TC-DB-2-F Run 1](runs/tc-db-2-F-run-1.md) — PASS — Field11 `3/15/2026` matches stored `2026-03-15T00:00:00Z`
- 2026-04-02 [TC-DB-2-G Run 1](runs/tc-db-2-G-run-1.md) — PASS — Field14 `3/15/2026 2:30 PM` matches stored `2026-03-15T14:30:00Z`
- 2026-04-02 [TC-DB-2-H Run 1](runs/tc-db-2-H-run-1.md) — PASS — Field13 `3/15/2026 2:30 PM` matches stored `2026-03-15T14:30:00Z`

**Key finding**: Dashboard accurately represents stored database values for all 8 configs. Server renders UTC time directly (no TZ conversion). The `ignoreTZ` and `useLegacy` flags remain invisible to the server-side formatter. Any incorrect dates in the dashboard were stored incorrectly at write time.

---

## DB-3 Batch Run — 2026-04-02

**Environment**: WS-1 API record creation + Playwright headless Chrome verification
**Method**: Create records with bug-simulated stored values, verify dashboard renders them faithfully
**Records**: DateTest-001077 (A,B,E,F Bug #7), DateTest-001078 (C Bug #7v), DateTest-001079 (D Bug #5), DateTest-001081 (G,H legacy UTC)

- 2026-04-02 [TC-DB-3-A Run 1](runs/tc-db-3-A-run-1.md) — PASS — Field7 `3/14/2026` (Bug #7 -1 day, intended 3/15)
- 2026-04-02 [TC-DB-3-B Run 1](runs/tc-db-3-B-run-1.md) — PASS — Field10 `3/14/2026` (Bug #7, ignoreTZ inert)
- 2026-04-02 [TC-DB-3-C Run 1](runs/tc-db-3-C-run-1.md) — PASS — Field6 `3/14/2026 12:00 AM` (Bug #7 variant on DateTime)
- 2026-04-02 [TC-DB-3-D Run 1](runs/tc-db-3-D-run-1.md) — PASS — Field5 `3/14/2026 9:00 PM` (Bug #5 drift -3h BRT)
- 2026-04-02 [TC-DB-3-E Run 1](runs/tc-db-3-E-run-1.md) — PASS — Field12 `3/14/2026` (Bug #7, legacy flag inert)
- 2026-04-02 [TC-DB-3-F Run 1](runs/tc-db-3-F-run-1.md) — PASS — Field11 `3/14/2026` (Bug #7, both flags inert)
- 2026-04-02 [TC-DB-3-G Run 1](runs/tc-db-3-G-run-1.md) — PASS — Field14 `3/14/2026 6:30 PM` (legacy popup UTC from IST)
- 2026-04-02 [TC-DB-3-H Run 1](runs/tc-db-3-H-run-1.md) — PASS — Field13 `3/14/2026 6:30 PM` (legacy popup UTC, ignoreTZ inert)

**Key finding**: All 8 configs confirm write-layer bugs propagate to the dashboard unchanged. The dashboard is a transparent read-only window into database state — it introduces no bugs but also corrects none. Wrong dates stored by Bug #7, Bug #5 drift, and legacy UTC storage are all faithfully displayed.

---

## DB-4 Batch Run — 2026-04-02

**Environment**: Playwright headless Chrome, `test-sort-v4.js` with `__doPostBack` via injected script tag
**Method**: Click column headers to trigger server-side sort, capture column values, verify chronological order
**Sort trigger**: `__doPostBack` via `addScriptTag` (workaround for ASP.NET strict mode incompatibility in `page.evaluate`)

- 2026-04-02 [TC-DB-4-F7-ASC Run 1](runs/tc-db-4-f7-asc-run-1.md) — PASS — Field7 ascending, 0 violations / 39 dates, empty→TOP
- 2026-04-02 [TC-DB-4-F7-DESC Run 1](runs/tc-db-4-f7-desc-run-1.md) — PASS — Field7 descending, 0 violations / 111 dates, empty→BOTTOM
- 2026-04-02 [TC-DB-4-F6-ASC Run 1](runs/tc-db-4-f6-asc-run-1.md) — PASS — Field6 ascending, empty cells push all dates to page 2
- 2026-04-02 [TC-DB-4-F6-DESC Run 1](runs/tc-db-4-f6-desc-run-1.md) — PASS — Field6 descending, 0 violations / 55 datetimes, time component included in sort

**Key findings**:

- Server sorts date columns as proper datetime, not text — chronological order is correct
- Empty cells sort to TOP (ascending) or BOTTOM (descending)
- DateTime sort includes time component: `3/15 5:30 PM` > `3/15 2:30 PM` > `3/15 12:00 AM` (correct)
- Bug #7 shifted dates sort correctly among non-shifted dates

---

## DB-5 Batch Run — 2026-04-02

**Environment**: Playwright headless Chrome, `test-filter-v3.js --batch`
**Method**: Apply SQL WHERE clause via hidden `txtSQLFilter` textarea + `__doPostBack`, count and verify filtered results
**Filter mechanism**: Hidden SQL filter panel in RadGrid dock — textarea accepts raw SQL WHERE expressions

- 2026-04-02 [TC-DB-5-EXACT Run 1](runs/tc-db-5-exact-run-1.md) — PASS — `Field7 = '3/15/2026'` → 66 records, exact match excludes Bug #7
- 2026-04-02 [TC-DB-5-RANGE Run 1](runs/tc-db-5-range-run-1.md) — PASS — `Field7 >= '3/14' AND <= '3/15'` → 85 records (66 + 19 Bug #7)
- 2026-04-02 [TC-DB-5-DT-EXACT Run 1](runs/tc-db-5-dt-exact-run-1.md) — PASS — `Field6 = '3/15/2026'` → 25 records, midnight only (time component matters)
- 2026-04-02 [TC-DB-5-DT-RANGE Run 1](runs/tc-db-5-dt-range-run-1.md) — PASS — `Field5 >= '3/14' AND <= '3/15 11:59 PM'` → 50 records, all times in range

**Key findings**:

- SQL filter works correctly for both date-only and DateTime columns
- Date-only `=` does exact date comparison — Bug #7 shifted dates correctly excluded/included by range
- DateTime `=` with date-only input matches ONLY midnight records (`12:00 AM`) — server treats `'3/15/2026'` as `'3/15/2026 12:00:00 AM'`
- **To find all records on a date in a DateTime column, must use range, not `=`** — this is a critical usability finding
- DateTime range with explicit time bounds (`11:59 PM`) correctly captures all time variants
- Filter applied via hidden `txtSQLFilter` textarea — no visual filter builder interaction needed

---

## DB-6 Batch Run — 2026-04-02

**Environment**: Playwright headless Chrome (BRT), `test-cross-layer.js`
**Method**: Load dashboard → capture grid values → navigate to FormViewer by DataID → capture form display/raw/GFV → compare
**Records**: DateTest-000889 (date-only A,B,E,F), DateTest-000890 (DateTime C,D,G,H)
**Code Path**: V1 (`useUpdatedCalendarValueLogic = false`)

- 2026-04-02 [TC-DB-6-A Run 1](runs/tc-db-6-A-run-1.md) — FAIL-1 — `3/15/2026` vs `03/15/2026` (format: leading zeros)
- 2026-04-02 [TC-DB-6-B Run 1](runs/tc-db-6-B-run-1.md) — FAIL-1 — `3/15/2026` vs `03/15/2026` (same as A)
- 2026-04-02 [TC-DB-6-C Run 1](runs/tc-db-6-C-run-1.md) — FAIL-2 — `2:30 PM` (UTC) vs `11:30 AM` (BRT) — 3h time shift
- 2026-04-02 [TC-DB-6-D Run 1](runs/tc-db-6-D-run-1.md) — FAIL-1 — `2:30 PM` vs `02:30 PM` (format only — ignoreTZ preserves time)
- 2026-04-02 [TC-DB-6-E Run 1](runs/tc-db-6-E-run-1.md) — FAIL-1 — `3/15/2026` vs `03/15/2026` (legacy, same as A)
- 2026-04-02 [TC-DB-6-F Run 1](runs/tc-db-6-F-run-1.md) — FAIL-1 — `3/15/2026` vs `03/15/2026` (both flags inert)
- 2026-04-02 [TC-DB-6-G Run 1](runs/tc-db-6-G-run-1.md) — FAIL-2 — `2:30 PM` (UTC) vs `11:30 AM` (BRT) — same as C
- 2026-04-02 [TC-DB-6-H Run 1](runs/tc-db-6-H-run-1.md) — FAIL-1 — `2:30 PM` vs `02:30 PM` (format only — same as D)

**Key findings**:

- **All 8 configs FAIL** — dashboard and form display NEVER match exactly
- **Two failure modes**: FAIL-1 (format only: leading zeros) and FAIL-2 (UTC vs BRT time shift)
- **Date-only (A,B,E,F)**: Format mismatch — server `M/d/yyyy` vs Angular `MM/dd/yyyy`. Date correct in both.
- **DateTime ignoreTZ=false (C,G)**: Time shift — dashboard shows UTC (`2:30 PM`), form shows BRT local (`11:30 AM`). 3h gap = BRT offset.
- **DateTime ignoreTZ=true (D,H)**: Display time matches (`2:30 PM` ≡ `02:30 PM`) — format differs only. But raw value diverged: form stores BRT local `T11:30:00` internally despite displaying `02:30 PM`.
- **Bug #5 visible in Config D GFV**: `"2026-03-15T11:30:00.000Z"` — fake Z on local time. Legacy Config H GFV has no fake Z (`"2026-03-15T11:30:00"`).

---

## DB-8 Run — 2026-04-02

**Environment**: Playwright headless Chrome, `explore-dashboard.js --compare`
**Method**: Load dashboard in 3 browser TZ contexts (BRT, IST, UTC0), capture date values for 10 records, compare field-by-field

- 2026-04-02 [TC-DB-8-TZ Run 1](runs/tc-db-8-tz-run-1.md) — PASS — 10 records × all fields: BRT ≡ IST ≡ UTC0, 0 mismatches

**Key finding**: Dashboard is 100% server-side rendered. Browser timezone has zero effect on displayed date values. All DB-1 through DB-7 tests validly used a single TZ (BRT).
