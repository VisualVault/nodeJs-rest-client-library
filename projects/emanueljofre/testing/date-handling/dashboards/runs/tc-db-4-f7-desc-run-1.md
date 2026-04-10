# TC-DB-4-F7-DESC — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-4-f7-desc.md](tasks/date-handling/dashboards/test-cases/tc-db-4-f7-desc.md) | **Summary**: [summary](../summaries/tc-db-4-f7-desc.md)

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

| Step # | Expected                         | Actual                                            | Match |
| ------ | -------------------------------- | ------------------------------------------------- | ----- |
| 1      | Grid sorted ascending on Field7  | Ascending sort active from prior step             | PASS  |
| 2      | Newest dates first, 0 violations | 0 violations across 111 non-empty dates on page 1 | PASS  |
| 3      | Newest date first                | First: `"6/20/2026"` (DateTest-001002)            | PASS  |
| 4      | Oldest date last                 | Last: `"3/14/2026"` (DateTest-000901)             | PASS  |
| 5      | Empty cells at BOTTOM            | 89 empty rows at bottom, 111 dated rows at top    | PASS  |

## Outcome

**PASS** — Field7 descending sort produces correct reverse chronological order with 0 violations across all 111 dated records. Empty cells sort to bottom.

## Findings

- Descending toggle works correctly — 2nd click reverses order
- All 111 dated records visible on page 1 (empty cells pushed to bottom, fitting within 200 row page)
- Date range verified: `6/20/2026` → `5/3/2026` → `4/14/2026` → `3/15/2026` → `3/14/2026`
- Bug #7 shifted dates (`3/14/2026`, `4/14/2026`) sort correctly among non-shifted dates
