# TC-DB-2-G — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-2-G.md](../test-cases/tc-db-2-G.md) | **Summary**: [summary](../summaries/tc-db-2-G.md)

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

**PASS** — Field14 (Config G, legacy DateTime) dashboard display `3/15/2026 2:30 PM` accurately represents the stored UTC value.

## Findings

- `useLegacy=true` has no effect on server-side DateTime rendering — identical to Config C
- Server renders UTC time directly regardless of legacy flag
- All 4 DateTime configs (C, D, G, H) produce identical dashboard output for the same stored value
