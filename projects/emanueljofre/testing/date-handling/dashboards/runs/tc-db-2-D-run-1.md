# TC-DB-2-D — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-2-D.md](tasks/date-handling/dashboards/test-cases/tc-db-2-D.md) | **Summary**: [summary](../summaries/tc-db-2-D.md)

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

| Step # | Expected                                                          | Actual                                       | Match |
| ------ | ----------------------------------------------------------------- | -------------------------------------------- | ----- |
| 1      | Dashboard loaded, target record visible                           | Grid loaded, 200 rows, DateTest-000890 found | PASS  |
| 2      | `"3/15/2026 2:30 PM"` — matches stored `2026-03-15T14:30:00Z` UTC | `"3/15/2026 2:30 PM"`                        | PASS  |

## Outcome

**PASS** — Field5 (Config D, DateTime+ignoreTZ) dashboard display `3/15/2026 2:30 PM` accurately represents the stored UTC value.

## Findings

- `ignoreTZ=true` has no effect on server-side rendering — identical behavior to Config C
- Server reads `T14:30:00Z` and formats as `2:30 PM` regardless of client-side flags
- Bug #5 (fake Z in GetFieldValue) and Bug #6 (Invalid Date for empty fields) are client-side only — they do not affect the stored value or dashboard display for records written via API
- For records written via Forms (where Bug #5 drift accumulates), the dashboard would show the drifted stored value accurately
