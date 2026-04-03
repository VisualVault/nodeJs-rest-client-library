# TC-DB-5-EXACT — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-5-exact.md](../test-cases/tc-db-5-exact.md) | **Summary**: [summary](../summaries/tc-db-5-exact.md)

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

| Step # | Expected                         | Actual                                   | Match |
| ------ | -------------------------------- | ---------------------------------------- | ----- |
| 1      | Dashboard loaded, 272 records    | 272 items in 2 pages                     | PASS  |
| 2      | Filter to `Field7 = '3/15/2026'` | Filter applied via `__doPostBack`        | PASS  |
| 3      | 66 records returned              | 66 records, 66 rows                      | PASS  |
| 4      | All show `3/15/2026`             | All 66 non-empty values = `"3/15/2026"`  | PASS  |
| 5      | Bug #7 records (3/14) excluded   | No `3/14/2026` or `4/14/2026` in results | PASS  |
| 6      | Clear → 272 records              | 272 records restored                     | PASS  |

## Outcome

**PASS** — SQL exact match on date-only Field7 works correctly. Returns only records with `3/15/2026`, excludes Bug #7 shifted dates (`3/14/2026`).

## Findings

- SQL `=` operator on date-only column does exact date comparison — correct behavior
- 66 records match `3/15/2026` exactly; 19 Bug #7 shifted records (`3/14/2026`) correctly excluded
- No timezone-related surprises — server compares stored date strings directly
- Filter applied via hidden `txtSQLFilter` textarea + `__doPostBack` — no visual filter builder needed
