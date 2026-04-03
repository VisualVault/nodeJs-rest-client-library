# TC-DB-7-EXCEL — Run 1 | 2026-04-03 | PASS

**Spec**: [tc-db-7-excel.md](../test-cases/tc-db-7-excel.md) | **Summary**: [summary](../summaries/tc-db-7-excel.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-03                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | `test-export-v1.js` — Playwright headless Chrome                            |
| Page Size      | 200                                                                         |
| Grid Records   | 200 (page 1), Export Records: 432 (all pages)                               |

## Step Results

| Step # | Expected                     | Actual                                                           | Match |
| ------ | ---------------------------- | ---------------------------------------------------------------- | ----- |
| 2      | File downloads               | `DateTest Dashboard.xls` (261,146 bytes)                         | PASS  |
| 3      | Opens as HTML table          | HTML table with all column headers                               | PASS  |
| 4      | Date-only field matches grid | grid=`"3/15/2026"` export=`"3/15/2026 12:00:00 AM"` (date-equiv) | PASS  |
| 6      | 432 records in export        | 432 records parsed                                               | PASS  |

## Outcome

**PASS** — Excel export contains all 432 records. All date values match grid display. Format difference: export adds `12:00:00 AM` to date-only fields (expected Telerik behavior). 5 baseline records compared with 0 mismatches.

## Findings

- Export format is HTML table with `.xls` extension (not native Excel format) — standard Telerik RadGrid behavior. Opens in Excel via HTML import.
- Date-only fields (Config A/B/E/F) get `12:00:00 AM` appended in export — cosmetic difference, date is preserved.
- Export includes ALL records across all pages (432), not just the current page (200).
- Reproducible via: `node tasks/date-handling/dashboards/test-export-v1.js --format excel`
