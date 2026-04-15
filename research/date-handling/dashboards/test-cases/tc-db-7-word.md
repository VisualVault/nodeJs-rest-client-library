# TC-DB-7-WORD — Word Export: dates match grid display (HTML-as-doc, format adds time)

## Environment Specs

| Parameter           | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| **Browser**         | Google Chrome, latest stable                                                  |
| **Dashboard URL**   | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component**  | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**    | None — server-rendered values are TZ-independent                              |
| **Export Format**   | Word (.doc) — HTML table with `.doc` extension (Telerik standard)             |
| **Expected Format** | Same as Excel export — HTML table, date-only fields get `12:00:00 AM`         |

## Preconditions

**P1** — Open the DateTest Dashboard. **P2** — Verify grid loaded. **P3** — Expand Export panel. **P4** — Identify reference record.

(Same as tc-db-7-excel.md — see that file for full precondition details.)

## Test Steps

| #   | Action                  | Test Data                              | Expected Result                                           | ✓   |
| --- | ----------------------- | -------------------------------------- | --------------------------------------------------------- | --- |
| 1   | Complete setup          | See Preconditions P1–P4                | Dashboard loaded, export panel visible                    | ☐   |
| 2   | Click "Export to Word"  | Click the Word export button           | Browser downloads `DateTest Dashboard.doc` file           | ☐   |
| 3   | Open exported file      | Open `.doc` in Word or text editor     | File opens as HTML table (same structure as Excel export) | ☐   |
| 4   | Compare date-only field | Check reference record date-only field | Date matches grid (format may add `12:00:00 AM`)          | ☐   |
| 5   | Compare DateTime field  | Check DateTime field                   | Date and time match grid                                  | ☐   |
| 6   | Verify record count     | Count rows in export                   | All grid records present (432 records)                    | ☐   |

> **Note**: Word and Excel exports are structurally identical (both HTML tables). The only difference is the file extension and MIME type.

## Fail Conditions

**FAIL-1 (Download fails):** No file downloaded. **FAIL-2 (Date mismatch):** Date differs beyond format. **FAIL-3 (Missing records):** Fewer records than grid.

(Same failure modes as tc-db-7-excel.md.)

## Related

| Reference     | Location                                |
| ------------- | --------------------------------------- |
| Matrix row    | `matrix.md` — row `db-7-word`           |
| Summary       | [summary](../summaries/tc-db-7-word.md) |
| Test script   | `test-export-v1.js`                     |
| Excel sibling | [tc-db-7-excel.md](tc-db-7-excel.md)    |
