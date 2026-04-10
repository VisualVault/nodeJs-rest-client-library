# TC-DB-3-H — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-3-H.md](tasks/date-handling/dashboards/test-cases/tc-db-3-H.md) | **Summary**: [summary](../summaries/tc-db-3-H.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-02                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | WS-1 record creation + Playwright headless Chrome verification              |
| Page Size      | 200                                                                         |
| Total Records  | 272                                                                         |
| Test Record    | DateTest-001081 (same record as db-3-G)                                     |

## Step Results

| Step # | Expected                                                      | Actual                             | Match |
| ------ | ------------------------------------------------------------- | ---------------------------------- | ----- |
| 1      | Dashboard loaded, test record visible                         | Grid loaded, DateTest-001081 found | PASS  |
| 2      | `"3/14/2026 6:30 PM"` — identical to Config G, ignoreTZ inert | `"3/14/2026 6:30 PM"`              | PASS  |

## Outcome

**PASS** — Legacy popup UTC storage identical for Config H. `ignoreTZ=true` has no effect on the legacy popup storage path.

## Findings

- Config H (ignoreTZ=true) produces byte-identical results to Config G (ignoreTZ=false)
- The `ignoreTZ` flag is invisible to the legacy popup storage path
- Completes DB-3: all 8 configs confirm that write-layer bugs propagate to the dashboard unchanged
