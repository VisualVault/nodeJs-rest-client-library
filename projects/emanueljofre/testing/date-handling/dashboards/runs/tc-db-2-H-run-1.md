# TC-DB-2-H — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-2-H.md](tasks/date-handling/dashboards/test-cases/tc-db-2-H.md) | **Summary**: [summary](../summaries/tc-db-2-H.md)

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

**PASS** — Field13 (Config H, legacy DateTime+ignoreTZ) dashboard display `3/15/2026 2:30 PM` accurately represents the stored UTC value.

## Findings

- Both `ignoreTZ=true` and `useLegacy=true` have no effect on server-side DateTime rendering
- All 4 DateTime configs produce identical output, confirming `enableTime` is the sole display-affecting flag
- This completes the DB-2 category: all 8 configs accurately display their stored values
- Key conclusion: the dashboard is a reliable read-only view of database content — any incorrect dates visible in the grid were stored incorrectly at write time (Forms, API, etc.)
