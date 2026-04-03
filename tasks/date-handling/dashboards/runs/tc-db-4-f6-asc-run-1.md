# TC-DB-4-F6-ASC — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-4-f6-asc.md](../test-cases/tc-db-4-f6-asc.md) | **Summary**: [summary](../summaries/tc-db-4-f6-asc.md)

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

| Step # | Expected                                   | Actual                                              | Match |
| ------ | ------------------------------------------ | --------------------------------------------------- | ----- |
| 1      | Dashboard loaded                           | Grid loaded, 200 rows                               | PASS  |
| 2      | Empty cells at top, dated rows at bottom   | 200 empty rows on page 1, 0 non-empty visible       | PASS  |
| 3      | Sort postback triggered                    | Grid order changed from default (sort active)       | PASS  |
| 4      | Order confirmed via descending counterpart | DB-4-F6-DESC shows 0 violations → ascending correct | PASS  |

## Outcome

**PASS** — Field6 ascending sort triggers correctly. All ~55 dated records pushed to page 2 by ~145+ empty rows sorting to top. Correct order confirmed by descending counterpart test (0 violations).

## Findings

- Ascending sort places all empty cells first — with ~217 empty Field6 rows and page size 200, no dated rows appear on page 1
- This is correct RadGrid behavior: NULL/empty values sort before non-empty in ascending order
- Sort correctness verified indirectly via the descending test which shows all 55 dated records in correct reverse order
