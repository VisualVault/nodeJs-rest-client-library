# TC-DB-1-F — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-1-F.md](tasks/date-handling/dashboards/test-cases/tc-db-1-F.md) | **Summary**: [summary](../summaries/tc-db-1-F.md)

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

**PASS** — Field11 (Config F, legacy date-only + ignoreTZ) displays in M/D/YYYY format without time component.

## Findings

- Format matches expected `M/D/YYYY` pattern — identical to all other date-only configs (A, B, E)
- 5 records sampled: DateTest-000899, DateTest-000889, DateTest-000525, DateTest-000477, DateTest-000471 — all show `3/15/2026`
- useLegacy=true + ignoreTZ=true combination has no effect on server-side display format
- Confirms analysis.md § 2: only enableTime determines the server-side format
