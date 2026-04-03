# TC-DB-4-F7-ASC — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-4-f7-asc.md](../test-cases/tc-db-4-f7-asc.md) | **Summary**: [summary](../summaries/tc-db-4-f7-asc.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-02                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | Playwright headless Chrome (`test-sort-v4.js --field Field7`)               |
| Page Size      | 200                                                                         |
| Total Records  | 272                                                                         |

## Step Results

| Step # | Expected                           | Actual                                           | Match |
| ------ | ---------------------------------- | ------------------------------------------------ | ----- |
| 1      | Dashboard loaded                   | Grid loaded, 200 rows                            | PASS  |
| 2      | Earliest dates first, 0 violations | 0 violations across 39 non-empty dates on page 1 | PASS  |
| 3      | Oldest date first                  | First: `"3/14/2026"` (DateTest-001077)           | PASS  |
| 4      | Newest date last                   | Last: `"3/15/2026"` (DateTest-001003)            | PASS  |
| 5      | Empty cells at TOP                 | 161 empty rows at top, 39 dated rows at bottom   | PASS  |

## Outcome

**PASS** — Field7 ascending sort produces correct chronological order with 0 violations across 39 visible dates. Empty cells sort to top.

## Findings

- Server sorts date-only column as proper datetime, not text — `3/14/2026` < `3/15/2026` < `4/14/2026` (correct)
- Empty cells (no Field7 value) sort to TOP in ascending order
- Only 39 of ~111 total dated records visible on page 1 (remaining on page 2 behind empty rows)
- Sort mechanism: `__doPostBack` via injected script tag (strict mode workaround for ASP.NET PageRequestManager)
