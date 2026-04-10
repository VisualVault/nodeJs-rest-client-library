# TC-DB-2-F — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-2-F.md](tasks/date-handling/dashboards/test-cases/tc-db-2-F.md) | **Summary**: [summary](../summaries/tc-db-2-F.md)

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

**PASS** — Field11 (Config F, legacy date-only+ignoreTZ) dashboard display `3/15/2026` accurately represents the stored value.

## Findings

- Both `ignoreTZ=true` and `useLegacy=true` have no effect on server-side rendering
- All 4 date-only configs (A, B, E, F) produce identical dashboard output for the same stored value
- Server-side formatter is fully deterministic: `enableTime` is the sole display-affecting flag
