# TC-DB-1-A — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-1-A.md](tasks/date-handling/dashboards/test-cases/tc-db-1-A.md) | **Summary**: [summary](../summaries/tc-db-1-A.md)

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

**PASS** — Field7 (Config A, date-only) displays in M/D/YYYY format without time component.

## Findings

- Format matches expected `M/D/YYYY` pattern — no leading zeros, no time component
- 5 records sampled: DateTest-001071 (`3/15/2026`), DateTest-001070 (`4/14/2026`), DateTest-001069 (`4/14/2026`), DateTest-001068 (`4/14/2026`), DateTest-001067 (`3/15/2026`)
- All values follow the same format pattern; date accuracy is a DB-2/DB-3 concern, not DB-1
- enableTime=false correctly suppresses time display in the server-side renderer
