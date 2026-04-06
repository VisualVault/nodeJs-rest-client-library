# TC-DB-7-WORD — Run 1 | 2026-04-03 | PASS

**Spec**: [tc-db-7-word.md](../test-cases/tc-db-7-word.md) | **Summary**: [summary](../summaries/tc-db-7-word.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-03                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | `test-export-v1.js` — Playwright headless Chrome                            |
| Export Records | 432 (all pages)                                                             |

## Step Results

| Step # | Expected                     | Actual                                                           | Match |
| ------ | ---------------------------- | ---------------------------------------------------------------- | ----- |
| 2      | File downloads               | `DateTest Dashboard.doc` (261,089 bytes)                         | PASS  |
| 3      | Opens as HTML table          | HTML table, same structure as Excel                              | PASS  |
| 4      | Date-only field matches grid | grid=`"3/15/2026"` export=`"3/15/2026 12:00:00 AM"` (date-equiv) | PASS  |
| 6      | 432 records                  | 432 records parsed                                               | PASS  |

## Outcome

**PASS** — Word export structurally identical to Excel export (both HTML tables). All dates match. Same `12:00:00 AM` format addition for date-only fields.

## Findings

- Word export is HTML table with `.doc` extension — not native Word format. Opens in Word via HTML import.
- File size nearly identical to Excel (261,089 vs 261,146 bytes) — confirms same underlying HTML.
- Reproducible via: `npx playwright test testing/date-handling/dash-export.spec.js --grep "word export"`
