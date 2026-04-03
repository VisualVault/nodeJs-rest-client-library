# TC-DB-4-F6-DESC — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-4-f6-desc.md](../test-cases/tc-db-4-f6-desc.md) | **Summary**: [summary](../summaries/tc-db-4-f6-desc.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-02                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | Playwright headless Chrome (`test-sort-v4.js --field Field6`)               |
| Page Size      | 200                                                                         |
| Total Records  | 272                                                                         |

## Step Results

| Step # | Expected                             | Actual                                         | Match |
| ------ | ------------------------------------ | ---------------------------------------------- | ----- |
| 1      | Grid sorted ascending on Field6      | Ascending sort active from prior step          | PASS  |
| 2      | Newest datetimes first, 0 violations | 0 violations across 55 non-empty datetimes     | PASS  |
| 3      | Newest datetime first                | First: `"6/20/2026 9:00 AM"` (DateTest-001005) | PASS  |
| 4      | Oldest datetime last                 | Last: `"2/15/2026 12:00 AM"` (DateTest-000143) | PASS  |
| 5      | Empty cells at BOTTOM                | 145 empty rows at bottom, 55 dated rows at top | PASS  |

## Outcome

**PASS** — Field6 descending sort produces correct reverse chronological order with 0 violations across all 55 DateTime values. Time component included in sort comparison.

## Findings

- Server sorts DateTime column correctly including time: `6/20 9:00 AM` > `4/14 12:00 AM` > `3/15 5:30 PM` > `3/15 2:30 PM` > `3/15 12:00 AM` > `3/14 12:00 AM` > `2/15 12:00 AM`
- Time component IS considered in sort — `3/15 5:30 PM` correctly sorts after `3/15 2:30 PM` on same date
- Bug #7 shifted dates (`3/14/2026 12:00 AM`) sort correctly among non-shifted dates
- Mixed time components (12:00 AM, 2:30 PM, 3:00 AM, 5:30 PM, 9:00 AM) all sort by full datetime
