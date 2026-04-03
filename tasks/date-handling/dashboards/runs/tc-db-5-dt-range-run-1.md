# TC-DB-5-DT-RANGE — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-5-dt-range.md](../test-cases/tc-db-5-dt-range.md) | **Summary**: [summary](../summaries/tc-db-5-dt-range.md)

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

| Step # | Expected                                            | Actual                                           | Match |
| ------ | --------------------------------------------------- | ------------------------------------------------ | ----- |
| 1      | Dashboard loaded, 272 records                       | 272 items in 2 pages                             | PASS  |
| 2      | Filter to `Field5 >= '3/14' AND <= '3/15 11:59 PM'` | Filter applied                                   | PASS  |
| 3      | 50 records                                          | 50 records, 50 rows                              | PASS  |
| 4      | Mix of times in results                             | 12:00 AM, 2:00 AM, 2:30 PM, 9:00 PM all present  | PASS  |
| 5      | Bug #5 drifted record included                      | DateTest-001079 `"3/14/2026 9:00 PM"` in results | PASS  |
| 6      | Clear → 272 records                                 | 272 records restored                             | PASS  |

## Outcome

**PASS** — SQL DateTime range on Field5 correctly captures all records within the 2-day window including Bug #5 drifted values.

## Findings

- DateTime range correctly includes all time variants: midnight, 2:00 AM, 2:30 PM, 9:00 PM
- Bug #5 drifted record (DateTest-001079, `3/14/2026 9:00 PM`) correctly captured by the range starting at `3/14/2026`
- 50 records across the range — includes both API-written values (2:30 PM) and Forms-saved values (12:00 AM, 2:00 AM)
- The `11:59 PM` upper bound correctly includes all times on 3/15 — records with `3/15/2026 2:30 PM` are included
- Using `<= '3/15/2026'` instead of `<= '3/15/2026 11:59 PM'` would have excluded non-midnight 3/15 records (same behavior as db-5-dt-exact)
