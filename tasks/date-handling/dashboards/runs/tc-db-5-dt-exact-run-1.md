# TC-DB-5-DT-EXACT — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-5-dt-exact.md](../test-cases/tc-db-5-dt-exact.md) | **Summary**: [summary](../summaries/tc-db-5-dt-exact.md)

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

| Step # | Expected                           | Actual                                        | Match |
| ------ | ---------------------------------- | --------------------------------------------- | ----- |
| 1      | Dashboard loaded, 272 records      | 272 items in 2 pages                          | PASS  |
| 2      | Filter to `Field6 = '3/15/2026'`   | Filter applied                                | PASS  |
| 3      | 25 records (midnight-only matches) | 25 records, 25 rows                           | PASS  |
| 4      | All show `3/15/2026 12:00 AM`      | All 25 = `"3/15/2026 12:00 AM"`               | PASS  |
| 5      | Non-midnight records excluded      | No `2:30 PM`, `3:00 AM`, `5:30 PM` in results | PASS  |
| 6      | Clear → 272 records                | 272 records restored                          | PASS  |

## Outcome

**PASS** — SQL exact date match on DateTime Field6 treats `'3/15/2026'` as `3/15/2026 12:00:00 AM` (midnight). Only midnight records match.

## Findings

- **Critical behavior**: `Field6 = '3/15/2026'` is equivalent to `Field6 = '3/15/2026 12:00:00 AM'` — SQL does NOT cast to date-only
- Records with `3/15/2026 2:30 PM` (BRT API writes) are EXCLUDED — the time component matters
- Records with `3/15/2026 3:00 AM` (BRT midnight→UTC) are EXCLUDED
- Only records stored with exactly `2026-03-15T00:00:00Z` (midnight UTC) match
- This has practical implications: to find "all records on March 15" in a DateTime column, you MUST use a range, not `=`
- Mixed timezone storage makes exact-date queries unreliable on DateTime fields
