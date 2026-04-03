# TC-DB-7-XML — Run 1 | 2026-04-03 | PASS

**Spec**: [tc-db-7-xml.md](../test-cases/tc-db-7-xml.md) | **Summary**: [summary](../summaries/tc-db-7-xml.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-03                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | `test-export-v1.js` — Playwright headless Chrome                            |
| Export Records | 432 (all pages)                                                             |

## Step Results

| Step # | Expected                                  | Actual                                                            | Match |
| ------ | ----------------------------------------- | ----------------------------------------------------------------- | ----- |
| 2      | File downloads                            | `DateTest Dashboard.xml` (203,243 bytes)                          | PASS  |
| 3      | Well-formed XML                           | `<VisualVault>` root, `<DateTest>` elements, XSD schema           | PASS  |
| 4      | Date-only: ISO matches grid calendar date | grid=`"3/15/2026"` xml=`"2026-03-15T00:00:00+00:00"` (date-equiv) | PASS  |
| 6      | 432 records                               | 432 `<DateTest>` elements                                         | PASS  |

## Outcome

**PASS** — XML export contains all 432 records in well-formed XML with XSD schema. All dates match grid display when comparing calendar dates. Format is ISO 8601 with `+00:00` UTC offset.

## Findings

- XML is proper well-formed XML (not HTML) — includes XSD schema definition for all fields.
- Dates use ISO 8601 format: `2026-03-15T00:00:00+00:00` — the canonical machine-readable format.
- Field names use `_x0020_` encoding for spaces: `Form_x0020_ID`, but date field names (`Field7`, etc.) are unaffected (no spaces).
- Smaller file size than HTML exports (203KB vs 261KB) — XML is more compact than HTML table markup.
- Calendar date comparison correctly handles grid `M/D/YYYY` vs XML `YYYY-MM-DDTHH:MM:SS+00:00`.
- Reproducible via: `node tasks/date-handling/dashboards/test-export-v1.js --format xml`
