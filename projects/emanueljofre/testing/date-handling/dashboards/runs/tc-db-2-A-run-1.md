# TC-DB-2-A — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-2-A.md](tasks/date-handling/dashboards/test-cases/tc-db-2-A.md) | **Summary**: [summary](../summaries/tc-db-2-A.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-02                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | Playwright headless Chrome (`explore-dashboard.js --record`)                |
| Page Size      | 200                                                                         |
| Total Records  | 267                                                                         |

## Step Results

| Step # | Expected                                              | Actual                                       | Match |
| ------ | ----------------------------------------------------- | -------------------------------------------- | ----- |
| 1      | Dashboard loaded, target record visible               | Grid loaded, 200 rows, DateTest-000889 found | PASS  |
| 2      | `"3/15/2026"` — matches stored `2026-03-15T00:00:00Z` | `"3/15/2026"`                                | PASS  |

## Outcome

**PASS** — Field7 (Config A, date-only) dashboard display `3/15/2026` accurately represents the stored value `2026-03-15T00:00:00Z`.

## Findings

- Dashboard date part matches the UTC date stored via API — server extracts date from ISO datetime correctly
- No timezone shift: `T00:00:00Z` midnight UTC renders as `3/15/2026`, not shifted to previous day
- Consistent with DB-1-A format verification (same field, same format)
- API write path (WS-1) stores clean UTC values that dashboard reads back accurately
