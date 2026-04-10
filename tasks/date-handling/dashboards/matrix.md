# Dashboards — Test Matrix

Methodology and test slot definitions for the dashboard date display investigation.
Analysis → `analysis/overview.md` | Exploration → `explore-dashboard.js`

**Execution results**: See `projects/{customer}/testing/date-handling/dashboards/status.md` per environment.

Total slots: 44

---

## ID Convention

Dashboard test IDs use the format `db-{category}-{config}` (e.g., `db-1-A`).
For non-config tests: `db-{category}-{variant}` (e.g., `db-4-sort-f7-asc`, `db-7-excel`).
Execution IDs: `db-{category}-{config}-run-{N}` or `db-{category}-batch-run-{N}`.

---

## Field Configurations

Same 8 field configurations as forms-calendar and web-services — tests target the same DateTest form:

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

### Field Variants (Initial Value Modes)

Dashboard displays ALL field variants — preset and currentDate fields are visible columns:

| Mode                    | Configs A–H Fields                                                    | Category relevance |
| ----------------------- | --------------------------------------------------------------------- | ------------------ |
| Base (no initial value) | Field7, Field10, Field6, Field5, Field12, Field11, Field14, Field13   | DB-1, DB-2, DB-3   |
| Preset (3/1/2026)       | Field2, Field27, Field15, Field16, Field19, Field20, Field21, Field22 | DB-2               |
| Current Date            | Field1, Field28, Field17, Field18, Field23, Field24, Field25, Field26 | DB-2               |

---

## TZ Dimension — Not Applicable

Dashboards are **server-side rendered** (Telerik RadGrid / ASP.NET). Browser timezone has zero effect on displayed values — confirmed via BRT vs IST comparison on 2026-04-02. A single TZ-independence confirmation test (DB-8) replaces the per-TC timezone dimension used in forms and web-services.

---

## Coverage Summary

Status tracked per-environment in `projects/{customer}/testing/date-handling/dashboards/status.md`.

| Category                     | Total  | Priority |
| ---------------------------- | :----: | :------: |
| DB-1. Display Format         |   8    |    P1    |
| DB-2. Date Accuracy          |   8    |    P1    |
| DB-3. Wrong Date Detection   |   8    |    P1    |
| DB-4. Column Sort            |   4    |    P2    |
| DB-5. Search / SQL Filter    |   4    |    P2    |
| DB-6. Cross-Layer Comparison |   8    |    P2    |
| DB-7. Export Verification    |   3    |    P3    |
| DB-8. TZ Independence        |   1    |    P1    |
| **TOTAL**                    | **44** |          |

---

## Execution Order

| Step | Category | Rationale                                                                                  |
| :--: | -------- | ------------------------------------------------------------------------------------------ |
|  1   | DB-8     | TZ independence — confirm BRT ≡ IST ≡ UTC0 (validates that all other tests need only 1 TZ) |
|  2   | DB-1     | Display format baseline — verify each config shows expected format                         |
|  3   | DB-2     | Date accuracy — compare dashboard values against known stored values (from WS results)     |
|  4   | DB-3     | Wrong date detection — check FORM-BUG-7 / FORM-BUG-4 surface in dashboard                  |
|  5   | DB-4     | Sort — verify date columns sort chronologically                                            |
|  6   | DB-5     | Filter — test SQL filter builder with date queries                                         |
|  7   | DB-6     | Cross-layer — open record from dashboard, compare with form display                        |
|  8   | DB-7     | Export — verify Excel/Word/XML date format                                                 |

---

## DB-1. Display Format Verification

**Purpose**: Verify that each field configuration displays dates in the expected format in the dashboard grid.

**Method**: Read grid cell text for a known record that has all fields populated (e.g., DateTest-000472).

| ID     | Config | Field   | Expected Format       | Expected Example     |
| ------ | :----: | ------- | --------------------- | -------------------- |
| db-1-A |   A    | Field7  | `M/D/YYYY`            | `3/15/2026`          |
| db-1-B |   B    | Field10 | `M/D/YYYY`            | `3/15/2026`          |
| db-1-C |   C    | Field6  | `M/D/YYYY H:MM AM/PM` | `3/15/2026 12:00 AM` |
| db-1-D |   D    | Field5  | `M/D/YYYY H:MM AM/PM` | `3/15/2026 12:00 AM` |
| db-1-E |   E    | Field12 | `M/D/YYYY`            | `3/15/2026`          |
| db-1-F |   F    | Field11 | `M/D/YYYY`            | `3/15/2026`          |
| db-1-G |   G    | Field14 | `M/D/YYYY H:MM AM/PM` | `3/15/2026 12:00 AM` |
| db-1-H |   H    | Field13 | `M/D/YYYY H:MM AM/PM` | `3/15/2026 12:00 AM` |

---

## DB-2. Date Accuracy

**Purpose**: Compare dashboard display values against known database values. Determines whether the server-side formatter accurately represents what's in the database.

**Method**: For records created via WS tests (known input → known stored value), read the dashboard grid and compare. DB values confirmed via DB dump (2026-04-06).

| ID     | Config | Field   | Expected Comparison                                       |
| ------ | :----: | ------- | --------------------------------------------------------- |
| db-2-A |   A    | Field7  | DB `datetime` midnight → dashboard `M/D/YYYY`             |
| db-2-B |   B    | Field10 | DB `datetime` midnight → dashboard `M/D/YYYY`             |
| db-2-C |   C    | Field6  | DB `datetime` with time → dashboard `M/D/YYYY H:MM AM/PM` |
| db-2-D |   D    | Field5  | DB `datetime` with time → dashboard `M/D/YYYY H:MM AM/PM` |
| db-2-E |   E    | Field12 | DB `datetime` midnight → dashboard `M/D/YYYY`             |
| db-2-F |   F    | Field11 | DB `datetime` midnight → dashboard `M/D/YYYY`             |
| db-2-G |   G    | Field14 | DB `datetime` with time → dashboard `M/D/YYYY H:MM AM/PM` |
| db-2-H |   H    | Field13 | DB `datetime` with time → dashboard `M/D/YYYY H:MM AM/PM` |

---

## DB-3. Wrong Date Detection

**Purpose**: Check if records affected by known bugs (FORM-BUG-7 wrong date in UTC+, FORM-BUG-4 DateTime UTC conversion) show the incorrect date in the dashboard. This tests whether bugs at the Forms/API write layer propagate to the read layer.

**Method**: Create records via WS-1 API with bug-simulated stored values, then verify the dashboard shows the shifted/drifted dates.

| ID     | Config | Field   | Bug | Intended Date        | Expected Shift              |
| ------ | :----: | ------- | --- | -------------------- | --------------------------- |
| db-3-A |   A    | Field7  | #7  | `3/15/2026`          | −1 day (UTC+ date boundary) |
| db-3-B |   B    | Field10 | #7  | `3/15/2026`          | −1 day                      |
| db-3-C |   C    | Field6  | #7v | `3/15/2026`          | −1 day + time shift         |
| db-3-D |   D    | Field5  | #5  | `3/15/2026 12:00 AM` | UTC conversion drift        |
| db-3-E |   E    | Field12 | #7  | `3/15/2026`          | −1 day                      |
| db-3-F |   F    | Field11 | #7  | `3/15/2026`          | −1 day                      |
| db-3-G |   G    | Field14 | leg | `3/15/2026 12:00 AM` | Legacy TZ offset            |
| db-3-H |   H    | Field13 | leg | `3/15/2026 12:00 AM` | Legacy TZ offset            |

---

## DB-4. Column Sort

**Purpose**: Verify that date columns sort in chronological order when the column header is clicked. Test both ascending and descending.

**Method**: Click column header to sort, capture first/last few rows, verify order.

| ID           | Variant | Column | Direction  |
| ------------ | ------- | ------ | ---------- |
| db-4-f7-asc  | A       | Field7 | Ascending  |
| db-4-f7-desc | A       | Field7 | Descending |
| db-4-f6-asc  | C       | Field6 | Ascending  |
| db-4-f6-desc | C       | Field6 | Descending |

---

## DB-5. Search / SQL Filter

**Purpose**: Test the SQL filter builder with date-based queries. Verify that date filtering works correctly given records with mixed time components from different write paths (SQL `datetime` column is TZ-unaware).

**Method**: Open filter builder, create date filter, verify results include/exclude expected records.

| ID            | Variant        | Filter Query                                               | Expected Result                    |
| ------------- | -------------- | ---------------------------------------------------------- | ---------------------------------- |
| db-5-exact    | Exact match    | `Field7 = '3/15/2026'`                                     | Records with 3/15 only             |
| db-5-range    | Date range     | `Field7 >= '3/14/2026' AND Field7 <= '3/15/2026'`          | Include shifted dates              |
| db-5-dt-exact | DateTime exact | `Field6 = '3/15/2026'`                                     | Depends on time component handling |
| db-5-dt-range | DateTime range | `Field5 >= '3/14/2026' AND Field5 <= '3/15/2026 11:59 PM'` | All times in range                 |

---

## DB-6. Cross-Layer Comparison

**Purpose**: Open a record from the dashboard, compare the date value shown in the dashboard grid vs what the Forms Angular SPA displays for the same record. Identifies format discrepancies between server-side grid rendering and client-side form rendering.

**Method**: Note dashboard grid value → click record → wait for form load → capture field display value and raw value via `captureFieldValues()`.

| ID     | Config | Field   | Expected Comparison                                     |
| ------ | :----: | ------- | ------------------------------------------------------- |
| db-6-A |   A    | Field7  | Dashboard `M/D/YYYY` vs Form `MM/DD/YYYY` vs raw ISO    |
| db-6-B |   B    | Field10 | Dashboard `M/D/YYYY` vs Form `MM/DD/YYYY` vs raw ISO    |
| db-6-C |   C    | Field6  | Dashboard UTC time vs Form BRT-adjusted time            |
| db-6-D |   D    | Field5  | Dashboard UTC time vs Form display (ignoreTZ preserves) |
| db-6-E |   E    | Field12 | Dashboard `M/D/YYYY` vs Form `MM/DD/YYYY` (legacy)      |
| db-6-F |   F    | Field11 | Dashboard `M/D/YYYY` vs Form `MM/DD/YYYY` (legacy)      |
| db-6-G |   G    | Field14 | Dashboard UTC time vs Form BRT-adjusted time (legacy)   |
| db-6-H |   H    | Field13 | Dashboard UTC time vs Form display (legacy, ignoreTZ)   |

---

## DB-7. Export Verification

**Purpose**: Export dashboard data and verify that date values in the exported file match what's displayed in the grid.

**Method**: Click Export → download file → parse and compare date values.

| ID         | Variant | Format        | Expected Export Format                |
| ---------- | ------- | ------------- | ------------------------------------- |
| db-7-excel | Excel   | `.xls` (HTML) | HTML table, dates add `12:00:00 AM`   |
| db-7-word  | Word    | `.doc` (HTML) | HTML table, same as Excel             |
| db-7-xml   | XML     | `.xml`        | ISO 8601: `YYYY-MM-DDT00:00:00+00:00` |

---

## DB-8. TZ Independence

**Purpose**: Confirm that the dashboard renders identical date values regardless of browser timezone. This validates that all other tests need only run in a single TZ.

**Method**: Load the same dashboard page in BRT, IST, and UTC0 browser contexts. Compare all date values for the same set of records.

| ID      | Variant              | Expected                        |
| ------- | -------------------- | ------------------------------- |
| db-8-tz | Full page comparison | BRT ≡ IST ≡ UTC0 (0 mismatches) |
