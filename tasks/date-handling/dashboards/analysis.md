# Dashboards — Analysis

Analysis of date handling behavior in VisualVault Analytic Dashboards. Covers how dates stored in the database are rendered, sorted, filtered, exported, and compared against the Forms client-side display.

Last updated: 2026-04-06 | Status: **COMPLETE** (44/44 tests executed)

---

## 1. Executive Summary

44 test cases across 8 categories (DB-1 through DB-8) were executed against the DateTest Dashboard between 2026-04-02 and 2026-04-03. Results: **36 PASS, 8 FAIL** (all failures in DB-6 cross-layer comparison).

**Key conclusions:**

- Dashboards are **100% server-rendered** (Telerik RadGrid / ASP.NET) — browser timezone has zero effect on displayed values
- The dashboard is a **transparent read-only window** into database state — it introduces no bugs but also corrects none
- All write-layer bugs (Bug #7 wrong day, Bug #5 drift, legacy UTC storage) **propagate faithfully** to the dashboard
- Dashboard and Forms display **never match exactly** — two failure modes: format difference (leading zeros) and UTC-vs-local time shift
- DateTime `=` filter only matches midnight records — range queries required for all-times-on-date lookups
- Exports preserve date values; Excel/Word append `12:00:00 AM` to date-only fields

**The dashboard component has zero bugs.** All incorrect dates visible in the grid originate from upstream write paths (Forms, API). Testing revealed **4 platform defects** (cross-component inconsistencies that should be reported to the VV platform team) and **2 standard platform behaviors** (documented with workarounds) — see § 7.

---

## 2. Scope

### Component Under Test

The VisualVault Analytic Dashboard — a server-rendered grid view backed by Telerik RadGrid (ASP.NET WebForms). Accessed via:

```
FormDataDetails?Mode=ReadOnly&ReportID={dashboard-id}
```

### What Was Tested

| Area            | Method                               | Categories        |
| --------------- | ------------------------------------ | ----------------- |
| Display format  | Grid cell text verification          | DB-1 (8 configs)  |
| Date accuracy   | Grid vs known stored values          | DB-2 (8 configs)  |
| Bug propagation | Records with known bugs              | DB-3 (8 configs)  |
| Column sort     | Header click + order verification    | DB-4 (4 variants) |
| SQL filter      | Hidden `txtSQLFilter` + result count | DB-5 (4 variants) |
| Cross-layer     | Dashboard grid vs Forms display      | DB-6 (8 configs)  |
| Export          | Excel/Word/XML download + parse      | DB-7 (3 formats)  |
| TZ independence | 3-TZ full-page comparison            | DB-8 (1 test)     |

### Field Configurations

Same 8 configurations (A–H) as Forms and Web Services — all tests target the DateTest form template:

| Config | enableTime | ignoreTZ | useLegacy | Test Field | Dashboard Format      |
| :----: | :--------: | :------: | :-------: | ---------- | --------------------- |
|   A    |   false    |  false   |   false   | Field7     | `M/D/YYYY`            |
|   B    |   false    |   true   |   false   | Field10    | `M/D/YYYY`            |
|   C    |    true    |  false   |   false   | Field6     | `M/D/YYYY H:MM AM/PM` |
|   D    |    true    |   true   |   false   | Field5     | `M/D/YYYY H:MM AM/PM` |
|   E    |   false    |  false   |   true    | Field12    | `M/D/YYYY`            |
|   F    |   false    |   true   |   true    | Field11    | `M/D/YYYY`            |
|   G    |    true    |  false   |   true    | Field14    | `M/D/YYYY H:MM AM/PM` |
|   H    |    true    |   true   |   true    | Field13    | `M/D/YYYY H:MM AM/PM` |

### Test Data

- **432 records** in the DateTest Dashboard (full export count)
- **267 records** visible in grid at test time (2 pages, page size 200)
- Reference records: DateTest-000889 (date-only), DateTest-000890 (DateTime), DateTest-001077/1078/1079/1081 (bug-simulated)

---

## 3. Architecture Baseline

### Server-Side Rendering (Foundational Finding)

The VV Dashboard uses **Telerik RadGrid** (ASP.NET WebForms), which renders HTML on the server. The server queries the SQL database, formats date values using .NET `DateTime` formatting, and sends pre-rendered HTML to the browser.

**Implications:**

- Browser timezone has **zero effect** on displayed values (confirmed BRT ≡ IST ≡ UTC0 — DB-8)
- No JavaScript date parsing occurs — `moment.js`, `calendarValueService`, and all Angular-side bugs are irrelevant
- The displayed value is a direct reflection of what the .NET server reads from SQL and formats
- Any incorrect dates visible in the dashboard were stored incorrectly at write time (Forms, API, etc.)

**Evidence:** 10 records × all fields compared across BRT, IST, UTC0 browser contexts — 0 mismatches ([DB-8 run](runs/tc-db-8-tz-run-1.md)).

### Display Format Rules

The server applies different formats based solely on the field's `enableTime` flag:

| enableTime | Server Format      | Example Output      |
| :--------: | ------------------ | ------------------- |
|  `false`   | `M/d/yyyy`         | `3/15/2026`         |
|   `true`   | `M/d/yyyy h:mm tt` | `3/15/2026 2:30 PM` |

The `ignoreTZ` and `useLegacy` flags do **not** affect the server-side display format. They only affect client-side behavior in the Forms Angular SPA. This was verified across all 8 configs (DB-1).

**Format characteristics:**

- US date format (month first), no leading zeros
- 12-hour clock with AM/PM for DateTime fields
- No seconds displayed, no timezone indicator
- Empty fields render as empty cells (no "Invalid Date" or placeholder)

### Grid Technology

- **Component**: Telerik RadGrid (`.RadGrid`, `.rgMasterTable`, `.rgRow`, `.rgAltRow`)
- **Page size**: 200 records per page
- **Columns**: 33 (FormID + 32 date fields across 8 configs × 3 initial-value modes + CurrentDate)
- **Sort**: Server-side via `__doPostBack` (ASP.NET postback)
- **Filter**: Hidden SQL filter panel with `txtSQLFilter` textarea accepting raw SQL WHERE expressions
- **Export**: Excel (.xls), Word (.doc), XML — all via `__doPostBack` triggers

---

## 4. Confirmed Behaviors

All confirmed behaviors (CBs) from 44 tests, reorganized by theme.

### Display & Format

| #       | Behavior                                                                                         | Evidence                                            |
| ------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| DB-CB-1 | Server format determined solely by `enableTime`: `M/d/yyyy` (false) or `M/d/yyyy h:mm tt` (true) | DB-1 all 8 configs PASS                             |
| DB-CB-2 | `ignoreTZ` and `useLegacy` flags have zero effect on server-side display format                  | DB-1: A≡E (legacy), B≡F (legacy+ignoreTZ), C≡G, D≡H |
| DB-CB-3 | Empty fields display as empty cells — no "Invalid Date", no placeholder                          | DB-1 exploratory, DB-4 sort (empty cells observed)  |

### Accuracy & Fidelity

| #       | Behavior                                                                    | Evidence                                                               |
| ------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| DB-CB-4 | Dashboard accurately represents stored database values for all 8 configs    | DB-2 all 8 configs PASS — grid values match known WS stored values     |
| DB-CB-5 | Server renders UTC time directly — no timezone conversion at read layer     | DB-2: `T14:30:00Z` → `2:30 PM`, `T00:00:00Z` → `12:00 AM`              |
| DB-CB-6 | All upstream bugs propagate faithfully — dashboard introduces no distortion | DB-3 all 8 configs PASS — Bug #7, Bug #5 drift, legacy UTC all visible |

**Upstream bug propagation:** Bug #7 wrong dates ([`forms-calendar/analysis/overview.md`](../forms-calendar/analysis/overview.md) § Bug #7), Bug #5 drift ([`forms-calendar/analysis/overview.md`](../forms-calendar/analysis/overview.md) § Bug #5), and mixed time components from different write paths ([`web-services/analysis/overview.md`](../web-services/analysis/overview.md) § "No Server-Side Date-Only Enforcement") are all visible in the dashboard grid. The dashboard is transparent — fixes must be applied at the write layer.

### TZ Independence

| #       | Behavior                                                            | Evidence                                         |
| ------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| DB-CB-7 | BRT ≡ IST ≡ UTC0 on all fields across all records — zero mismatches | DB-8: 10 records × all fields, 3 TZ contexts     |
| DB-CB-8 | Single-TZ testing is sufficient for all dashboard test categories   | DB-8 validates DB-1 through DB-7 ran in BRT only |

### Sort

| #        | Behavior                                                                  | Evidence                                                       |
| -------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| DB-CB-9  | Date columns sort as proper datetime (chronological), not text            | DB-4: 0 violations across all 4 sort tests                     |
| DB-CB-10 | Empty cells sort to TOP (ascending) or BOTTOM (descending)                | DB-4-F7-ASC (empty→TOP), DB-4-F7-DESC (empty→BOTTOM)           |
| DB-CB-11 | DateTime sort includes time component: `5:30 PM` > `2:30 PM` > `12:00 AM` | DB-4-F6-DESC: correct temporal ordering with time              |
| DB-CB-12 | Bug #7 shifted dates sort correctly among non-shifted dates               | DB-4: `3/14/2026` (shifted) sorts before `3/15/2026` (correct) |

### Filter

| #        | Behavior                                                                    | Evidence                                                                           |
| -------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| DB-CB-13 | Date-only `=` filter does exact date comparison — correct                   | DB-5-EXACT: 66 records for `Field7 = '3/15/2026'`                                  |
| DB-CB-14 | DateTime `=` filter with date-only input matches ONLY midnight (`12:00 AM`) | DB-5-DT-EXACT: 25 records (midnight only) — see § 7 "SQL Filter DateTime Behavior" |
| DB-CB-15 | Range queries work correctly for both date-only and DateTime columns        | DB-5-RANGE (85 records), DB-5-DT-RANGE (50 records)                                |
| DB-CB-16 | Bug #7 shifted records correctly included/excluded by filter criteria       | DB-5-RANGE: 85 = 66 correct + 19 Bug #7 shifted to 3/14                            |
| DB-CB-17 | Filter applied via hidden `txtSQLFilter` textarea — accepts raw SQL WHERE   | DB-5 all variants                                                                  |

### Export

| #        | Behavior                                                                                  | Evidence                                    |
| -------- | ----------------------------------------------------------------------------------------- | ------------------------------------------- |
| DB-CB-18 | Excel and Word exports are HTML tables with different extensions — structurally identical | DB-7-EXCEL, DB-7-WORD (same format)         |
| DB-CB-19 | XML export uses proper XML with ISO 8601 dates (`2026-03-15T00:00:00+00:00`)              | DB-7-XML                                    |
| DB-CB-20 | All exports include ALL records across all pages (432), not just current page (200)       | DB-7 all formats                            |
| DB-CB-21 | Date-only fields get `12:00:00 AM` appended in Excel/Word exports                         | DB-7-EXCEL — see § 7 "Export Serialization" |

### Cross-Layer (Dashboard vs Forms)

| #        | Behavior                                                                                       | Evidence                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| DB-CB-22 | Dashboard and Forms display NEVER match exactly — all 8 configs fail                           | DB-6 all 8 configs FAIL                                                                           |
| DB-CB-23 | Date-only fields: format mismatch only — server `M/d` vs Angular `MM/dd` (leading zeros)       | DB-6-A/B/E/F (FAIL-1)                                                                             |
| DB-CB-24 | DateTime ignoreTZ=false: time shift — dashboard shows UTC, form shows local                    | DB-6-C/G (FAIL-2): `2:30 PM` vs `11:30 AM` (3h BRT gap)                                           |
| DB-CB-25 | DateTime ignoreTZ=true: display time matches but format differs; raw value diverged internally | DB-6-D/H (FAIL-1): `2:30 PM` ≡ `02:30 PM` display, but form raw=`T11:30:00` ≠ stored `T14:30:00Z` |
| DB-CB-26 | Bug #5 visible in Config D GFV during cross-layer: `"T11:30:00.000Z"` — fake Z on local time   | DB-6-D run: GFV adds Z to BRT local value                                                         |
| DB-CB-27 | Legacy Config H GFV has no fake Z — `useLegacy=true` bypasses Bug #5                           | DB-6-H run: `"T11:30:00"` without Z suffix                                                        |

---

## 5. Hypothesis Resolution

Hypotheses formalized from the initial exploratory analysis (2026-04-02) and validated by DB-1 through DB-8 test execution.

| #    | Hypothesis                                                                                 | Result                    | Evidence                                                                                             |
| ---- | ------------------------------------------------------------------------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| DH-1 | Browser timezone affects dashboard date display                                            | **REFUTED**               | DB-8: BRT ≡ IST ≡ UTC0, 0 mismatches across 10 records × all fields                                  |
| DH-2 | Dashboard format depends on all three field config flags (enableTime, ignoreTZ, useLegacy) | **PARTIAL**               | DB-1: Only `enableTime` affects format. `ignoreTZ` and `useLegacy` are invisible to server renderer  |
| DH-3 | Dashboard accurately reflects stored database values                                       | **CONFIRMED**             | DB-2: All 8 configs PASS — grid values match known WS stored values exactly                          |
| DH-4 | Write-layer bugs propagate to dashboard unchanged                                          | **CONFIRMED**             | DB-3: All 8 configs show expected shifted/drifted values faithfully                                  |
| DH-5 | Date columns sort chronologically (not as text)                                            | **CONFIRMED**             | DB-4: 0 violations across 4 sort tests, time component included in sort order                        |
| DH-6 | SQL filter handles mixed timezone storage correctly                                        | **CONFIRMED with caveat** | DB-5: Date-only filters work correctly. DateTime `=` only matches midnight — range required (§ 7)    |
| DH-7 | Dashboard and Forms display match for the same record                                      | **REFUTED**               | DB-6: All 8 configs FAIL. Two failure modes: format (FAIL-1) and time shift (FAIL-2)                 |
| DH-8 | Export preserves date values faithfully                                                    | **CONFIRMED with caveat** | DB-7: Values preserved. Excel/Word append `12:00:00 AM` to date-only fields (§ 7). XML uses ISO 8601 |

---

## 6. Operational Guidance

Practical advice for dashboard users, administrators, and support staff.

### Interpreting "Wrong" Dates in the Dashboard

If a date looks wrong in the dashboard grid:

1. **The dashboard is correct** — it shows exactly what the database contains
2. **The error occurred at write time** — check which path created the record:
    - Forms popup from UTC+ timezone → Bug #7 (date-only fields store previous day)
    - Script round-trip via `GetFieldValue`/`SetFieldValue` on Config D → Bug #5 drift
    - Legacy popup (Configs G, H) → UTC conversion of local time (e.g., IST midnight → `6:30 PM` previous day UTC)
3. **To verify**: Use the API to read the raw stored value — it will match what the dashboard shows

### Filtering DateTime Columns

| Goal                                | Correct Filter                                             | Wrong Filter                                           |
| ----------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| All records on a specific date      | `Field6 >= '3/15/2026' AND Field6 <= '3/15/2026 11:59 PM'` | `Field6 = '3/15/2026'` (only returns midnight records) |
| Exact datetime match                | `Field6 = '3/15/2026 2:30 PM'`                             | —                                                      |
| Date range including Bug #7 shifted | `Field7 >= '3/14/2026' AND Field7 <= '3/15/2026'`          | `Field7 = '3/15/2026'` (misses shifted records)        |

**Rule of thumb**: For DateTime columns (`enableTime=true`), always use range queries. For date-only columns (`enableTime=false`), `=` works correctly.

### Dashboard vs Form Display Differences

| Scenario                        | Dashboard Shows      | Form Shows             | Explanation                                        |
| ------------------------------- | -------------------- | ---------------------- | -------------------------------------------------- |
| Date-only, any config           | `3/15/2026`          | `03/15/2026`           | Format: server no-pad vs Angular zero-pad          |
| DateTime, ignoreTZ=false (C, G) | `2:30 PM` (UTC time) | `11:30 AM` (local BRT) | Dashboard = UTC literal; Form = converted to local |
| DateTime, ignoreTZ=true (D, H)  | `2:30 PM`            | `02:30 PM`             | Same time, different format (no-pad vs zero-pad)   |

**If a user reports "the form shows a different time than the dashboard"**: this is expected behavior for `ignoreTZ=false` DateTime fields, not a bug. The dashboard shows UTC, the form shows the user's local time.

### Export Best Practices

| Use Case                 | Recommended Format | Why                                                                |
| ------------------------ | ------------------ | ------------------------------------------------------------------ |
| Programmatic consumption | XML                | Clean ISO 8601 dates, proper structure                             |
| Human review             | Excel              | Familiar interface, but strip `12:00:00 AM` from date-only columns |
| Archival                 | XML                | Unambiguous format, includes all 432 records                       |

All export formats include ALL records across all pages, not just the visible page.

---

## 7. Design Observations

Platform characteristics that affect dashboard behavior. No fixable code exists in the dashboard component or in this repo for any of these. Findings are classified as:

- **Platform defect** — cross-component inconsistency that should be reported to the VV platform team for correction
- **Platform behavior** — standard behavior of the underlying technology (SQL, Telerik) that could be improved but isn't wrong

### Dashboard Renders UTC, Forms Renders Local — PLATFORM DEFECT

The .NET server reads the datetime value from SQL and formats it **without timezone conversion**. A value stored as `T14:30:00Z` is displayed as `2:30 PM` regardless of the server's timezone or the user's location. The Forms Angular SPA, conversely, converts UTC to the user's local time via V1 `initCalendarValueV1`.

**Result:** Users see different times for the same record — dashboard `2:30 PM` (UTC) vs form `11:30 AM` (BRT, −3h). The gap equals the user's UTC offset. Affects `ignoreTZ=false` DateTime configs (C, G). Evidence: [DB-6-C](runs/tc-db-6-C-run-1.md), [DB-6-G](runs/tc-db-6-G-run-1.md) (FAIL-2). Related: WS CB-8, WS CB-29.

**Why this is a defect:** A platform should have a consistent TZ rendering policy. Users should not see different times for the same record depending on which view they use. The VV platform team needs to decide: should the dashboard convert to the user's local time (add server-side TZ logic), or should Forms stop converting (display UTC)? Either fix resolves the inconsistency — but the current state is a cross-component defect.

**Write-path dependency:** Records stored via `forminstance/` (US format, no Z) avoid this shift because Forms V1 parses US format as local time. Records stored via `postForms` (ISO+Z) trigger the UTC→local conversion. This explains Freshdesk #124697 (WS CB-31).

**Recommendation:** Report to VV platform team. Include DB-6-C/G evidence showing the 3h BRT gap. Reference WS CB-8 and Freshdesk #124697 as supporting context.

### Format Inconsistency: .NET vs Angular — PLATFORM DEFECT

| Layer            | Date Format  | DateTime Format      | Leading Zeros |
| ---------------- | ------------ | -------------------- | ------------- |
| Dashboard (.NET) | `M/d/yyyy`   | `M/d/yyyy h:mm tt`   | No            |
| Forms (Angular)  | `MM/dd/yyyy` | `MM/dd/yyyy hh:mm a` | Yes           |

Both layers display correct values — they just format them differently. All 8 configs show this mismatch (DB-6 FAIL-1). Evidence: [DB-6-A](runs/tc-db-6-A-run-1.md), [DB-6-B](runs/tc-db-6-B-run-1.md), [DB-6-E](runs/tc-db-6-E-run-1.md), [DB-6-F](runs/tc-db-6-F-run-1.md).

**Why this is a defect:** Dates displayed across the same platform should use consistent formatting. The fix is trivial — change one format string to match the other (either the .NET Telerik RadGrid column format or the Angular Kendo date pipe). The VV team needs to decide which format is canonical.

**Recommendation:** Report to VV platform team. Low priority — cosmetic only, no data integrity impact.

### No Server-Side Date-Only Enforcement — PLATFORM DEFECT

Fully documented in [`web-services/analysis/overview.md`](../web-services/analysis/overview.md) § "Cross-Layer Design Inconsistency: No Server-Side Date-Only Enforcement".

The VV server has no date-only storage type — every date field is stored as datetime regardless of the `enableTime` flag. Different write paths store different time components for the same intended date:

| Write Source                  | Stored Value           | Time Component                         |
| ----------------------------- | ---------------------- | -------------------------------------- |
| Forms popup (BRT)             | `2026-03-15T00:00:00Z` | UTC midnight                           |
| Forms popup (IST)             | `2026-03-14T00:00:00Z` | UTC midnight of **wrong day** (Bug #7) |
| Forms preset `3/1/2026` (BRT) | `2026-03-01T03:00:00Z` | BRT midnight = 3am UTC                 |
| Forms Current Date (BRT, 8pm) | `2026-03-31T23:01:57Z` | Actual timestamp                       |
| API string `"2026-03-15"`     | `2026-03-15T00:00:00Z` | UTC midnight                           |

Dashboard hides the time component for date-only fields, so this is invisible to users. But it affects SQL filter accuracy and export serialization (see below).

**Recommendation:** Report to VV platform team. The server should normalize date-only fields to `T00:00:00Z` on write regardless of the code path, or introduce a proper date-only column type.

### SQL Filter DateTime Behavior — PLATFORM BEHAVIOR

Standard SQL datetime comparison: `Field6 = '3/15/2026'` is interpreted as `Field6 = '3/15/2026 12:00:00 AM'`, matching only midnight records (25 of ~66 expected). This is standard SQL datetime semantics, not a bug.

**Workaround:** Always use range queries for DateTime columns: `Field6 >= '3/15/2026' AND Field6 <= '3/15/2026 11:59 PM'`. For date-only columns, `=` works correctly. Evidence: [DB-5-DT-EXACT](runs/tc-db-5-dt-exact-run-1.md), [DB-5-DT-RANGE](runs/tc-db-5-dt-range-run-1.md).

**Possible improvement:** The filter builder could offer an "on date" operator that auto-generates range queries for DateTime columns. This would be a UX enhancement, not a bug fix.

### Export Serialization — PLATFORM BEHAVIOR

Telerik RadGrid export serializes all date columns as datetime. Date-only values (`3/15/2026`) become `3/15/2026 12:00:00 AM` in Excel/Word exports. XML export uses ISO 8601 (`2026-03-15T00:00:00+00:00`).

**Workaround:** Use XML export for programmatic consumption (clean ISO 8601). For Excel/Word, post-process to strip `12:00:00 AM` from date-only columns. All export formats include ALL records (432), not just the current page. Evidence: [DB-7-EXCEL](runs/tc-db-7-excel-run-1.md), [DB-7-XML](runs/tc-db-7-xml-run-1.md).

**Possible improvement:** Configure Telerik RadGrid export column format strings per field type — use date-only format for `enableTime=false` fields. Low priority.

### `postForms` vs `forminstance/` Storage Format Difference — PLATFORM DEFECT

Fully documented in [`web-services/analysis/overview.md`](../web-services/analysis/overview.md) § CB-29.

| Endpoint                   | Storage Format                    | Forms V1 Interpretation                          |
| -------------------------- | --------------------------------- | ------------------------------------------------ |
| `postForms` (core API)     | `2026-03-15T14:30:00Z` (ISO+Z)    | Parses Z as UTC → converts to local → time shift |
| `forminstance/` (FormsAPI) | `03/15/2026 14:30:00` (US format) | Parses as local time → no conversion → preserved |

**Dashboard impact:** Both formats display identically in the dashboard grid (server normalizes on read). The difference only manifests when a user clicks through from dashboard to form — `postForms` records show the time shift, `forminstance/` records do not.

### Summary

| Finding                                | Classification        | Action                                                         |
| -------------------------------------- | --------------------- | -------------------------------------------------------------- |
| UTC vs local time rendering            | **Platform defect**   | Report to VV team — needs consistent TZ policy                 |
| Format inconsistency (.NET vs Angular) | **Platform defect**   | Report to VV team — trivial fix, low priority                  |
| No date-only enforcement               | **Platform defect**   | Report to VV team — server should normalize on write           |
| `postForms` vs `forminstance/` storage | **Platform defect**   | Report to VV team — two endpoints should produce same format   |
| SQL filter midnight-only               | **Platform behavior** | Document workaround (range queries); optional UX enhancement   |
| Export midnight append                 | **Platform behavior** | Document workaround (XML or post-process); optional config fix |

---

## 8. Test Coverage

**44 tests executed** across 8 categories between 2026-04-02 and 2026-04-03. Full details in [`matrix.md`](matrix.md).

| Category             | ID   | Tests  |  PASS  | FAIL  | Key Finding                                      |
| -------------------- | ---- | :----: | :----: | :---: | ------------------------------------------------ |
| Display Format       | DB-1 |   8    |   8    |   0   | Format determined solely by `enableTime`         |
| Date Accuracy        | DB-2 |   8    |   8    |   0   | Dashboard = DB truth for all configs             |
| Wrong Date Detection | DB-3 |   8    |   8    |   0   | All upstream bugs propagate faithfully           |
| Column Sort          | DB-4 |   4    |   4    |   0   | Chronological sort, empty→TOP/BOTTOM             |
| SQL Filter           | DB-5 |   4    |   4    |   0   | DateTime `=` only matches midnight               |
| Cross-Layer          | DB-6 |   8    |   0    |   8   | Dashboard ≠ Forms (format + time shift)          |
| Export               | DB-7 |   3    |   3    |   0   | Values preserved; midnight appended to date-only |
| TZ Independence      | DB-8 |   1    |   1    |   0   | BRT ≡ IST ≡ UTC0                                 |
| **TOTAL**            |      | **44** | **36** | **8** |                                                  |

### Artifact Counts

| Artifact Type      | Count | Location                                            |
| ------------------ | :---: | --------------------------------------------------- |
| Test case specs    |  44   | `test-cases/`                                       |
| Execution records  |  44   | `runs/`                                             |
| Summary files      |  44   | `summaries/`                                        |
| Playwright scripts |   5   | `*.js` (explore, sort, filter, export, cross-layer) |

---

## 9. Related

| Reference                                             | Location                                                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Forms calendar analysis (Bugs #5, #6, #7 definitions) | [`../forms-calendar/analysis/overview.md`](../forms-calendar/analysis/overview.md)                   |
| Web services analysis (CB-1 through CB-32, Bug #8)    | [`../web-services/analysis/overview.md`](../web-services/analysis/overview.md)                       |
| Dashboard test matrix (44 slots, per-test status)     | [`matrix.md`](matrix.md)                                                                             |
| Dashboard test evidence (session logs)                | [`results.md`](results.md)                                                                           |
| Dashboard architecture & selectors                    | [`README.md`](README.md)                                                                             |
| Freshdesk #124697 (postForms time mutation)           | [`../web-services/analysis/overview.md`](../web-services/analysis/overview.md) § CB-29               |
| VV platform architecture                              | [`../../docs/architecture/visualvault-platform.md`](../../docs/architecture/visualvault-platform.md) |
