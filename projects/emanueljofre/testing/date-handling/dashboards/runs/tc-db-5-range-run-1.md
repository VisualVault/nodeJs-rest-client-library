# TC-DB-5-RANGE — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-5-range.md](tasks/date-handling/dashboards/test-cases/tc-db-5-range.md) | **Summary**: [summary](../summaries/tc-db-5-range.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-02                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | Playwright headless Chrome (`test-filter-v3.js --batch`)                    |
| Page Size      | 200                                                                         |
| Total Records  | 272 (before filter)                                                         |

## Step Results

| Step # | Expected                                             | Actual                                   | Match |
| ------ | ---------------------------------------------------- | ---------------------------------------- | ----- |
| 1      | Dashboard loaded, 272 records                        | 272 items in 2 pages                     | PASS  |
| 2      | Filter to `Field7 >= '3/14/2026' AND <= '3/15/2026'` | Filter applied                           | PASS  |
| 3      | 85 records (66 correct + 19 shifted)                 | 85 records, 85 rows                      | PASS  |
| 4      | Mix of `3/14/2026` and `3/15/2026`                   | Both date values present                 | PASS  |
| 5      | Out-of-range dates excluded                          | No `4/14/2026` or `6/20/2026` in results | PASS  |
| 6      | Clear → 272 records                                  | 272 records restored                     | PASS  |

## Outcome

**PASS** — SQL range on date-only Field7 correctly captures both intended dates and Bug #7 shifted dates. Range boundaries are inclusive.

## Findings

- 85 total: 66 records with `3/15/2026` + 19 records with `3/14/2026` (Bug #7 shifted)
- SQL `>=` and `<=` operators are both inclusive — correct boundary behavior
- This range pattern is useful for finding all records associated with a target date that may have Bug #7 corruption
- Records with `4/14/2026` (intended 4/15, different test date) are correctly excluded
