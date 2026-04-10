# TC-DB-1-B — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-1-B.md](tasks/date-handling/dashboards/test-cases/tc-db-1-B.md) | **Summary**: [summary](../summaries/tc-db-1-B.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-02                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | Playwright headless Chrome                                                  |
| Page Size      | 200                                                                         |
| Total Records  | 267                                                                         |

## Step Results

| Step # | Expected                                            | Actual                | Match |
| ------ | --------------------------------------------------- | --------------------- | ----- |
| 1      | Dashboard loaded, target record visible             | Grid loaded, 200 rows | PASS  |
| 2      | `"3/15/2026"` — M/D/YYYY, no time, no leading zeros | `"3/15/2026"`         | PASS  |
| 3      | `"3/15/2026"` — same M/D/YYYY format                | `"3/15/2026"`         | PASS  |

## Outcome

**PASS** — Field10 (Config B, date-only + ignoreTZ) displays in M/D/YYYY format without time component.

## Findings

- Format matches expected `M/D/YYYY` pattern — identical to Config A (Field7)
- 5 records sampled: DateTest-000902 (`3/14/2026`), DateTest-000897 (`3/15/2026`), DateTest-000889 (`3/15/2026`), DateTest-000528 (`3/14/2026`), DateTest-000523 (`3/15/2026`)
- ignoreTZ=true has no effect on server-side display format, as expected (analysis.md § 2)
- Date accuracy differences (3/14 vs 3/15) are DB-2/DB-3 concerns
