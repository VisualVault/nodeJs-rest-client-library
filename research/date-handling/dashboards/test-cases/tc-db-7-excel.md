# TC-DB-7-EXCEL — Excel Export: dates match grid display (format adds time component)

## Environment Specs

| Parameter           | Value                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| **Browser**         | Google Chrome, latest stable                                                                            |
| **Dashboard URL**   | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25`                           |
| **Grid Component**  | Telerik RadGrid (server-rendered, ASP.NET)                                                              |
| **TZ Relevance**    | None — server-rendered values are TZ-independent                                                        |
| **Export Format**   | Excel (.xls) — HTML table with `.xls` extension (Telerik standard)                                      |
| **Expected Format** | Grid: `M/D/YYYY` or `M/D/YYYY H:MM AM/PM`. Export: same with `12:00:00 AM` appended to date-only fields |

## Preconditions

**P1** — Open the DateTest Dashboard in any browser:

```
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25
```

**P2** — Verify the RadGrid is loaded: column headers (Form ID, Field1, ...) visible.

**P3** — Expand the Export dock panel: click the "Export" toggle button in the toolbar to reveal export buttons.

**P4** — Identify at least one record with date values in the grid (e.g., `DateTest-001529` with `Field7 = 3/15/2026`).

## Test Steps

| #   | Action                  | Test Data                                              | Expected Result                                                           | ✓   |
| --- | ----------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- | --- |
| 1   | Complete setup          | See Preconditions P1–P4                                | Dashboard loaded, export panel visible, reference record identified       | ☐   |
| 2   | Click "Export to Excel" | Click the Excel export button                          | Browser downloads `DateTest Dashboard.xls` file                           | ☐   |
| 3   | Open exported file      | Open `.xls` in Excel or text editor                    | File opens as HTML table with column headers matching grid                | ☐   |
| 4   | Compare date-only field | Find reference record in export, check date-only field | Date matches grid value (format may include `12:00:00 AM` time component) | ☐   |
| 5   | Compare DateTime field  | Check DateTime field for same record                   | Date and time match grid value                                            | ☐   |
| 6   | Verify record count     | Count rows in export                                   | All grid records present in export (432 records)                          | ☐   |

> **Format note**: The Excel export adds `12:00:00 AM` to date-only fields (e.g., grid shows `3/15/2026`, export shows `3/15/2026 12:00:00 AM`). This is a display format difference, not a data mismatch — the underlying date is identical.

## Fail Conditions

**FAIL-1 (Download fails):** No file is downloaded after clicking the export button.

- Interpretation: The export button may not be properly connected. Try clicking "Export" toggle first to ensure the panel is expanded.

**FAIL-2 (Date mismatch):** A date value in the export differs from the grid display by more than a format difference (e.g., different day or month).

- Interpretation: The export query may use a different data source or transformation than the grid display.

**FAIL-3 (Missing records):** Export contains fewer records than expected.

- Interpretation: Export may be limited to the current page. Verify page size is set to 200 or check if pagination affects export scope.

## Related

| Reference       | Location                                                 |
| --------------- | -------------------------------------------------------- |
| Matrix row      | `matrix.md` — row `db-7-excel`                           |
| Summary         | [summary](../summaries/tc-db-7-excel.md)                 |
| Test script     | `test-export-v1.js` (reproducible automated test)        |
| DB-1 format ref | `test-cases/tc-db-1-A.md` — grid display format baseline |
