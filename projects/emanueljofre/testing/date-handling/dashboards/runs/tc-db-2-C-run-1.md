# TC-DB-2-C — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-2-C.md](tasks/date-handling/dashboards/test-cases/tc-db-2-C.md) | **Summary**: [summary](../summaries/tc-db-2-C.md)

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

**PASS** — Field6 (Config C, DateTime) dashboard display `3/15/2026 2:30 PM` accurately represents the stored UTC value `2026-03-15T14:30:00Z`.

## Findings

- Server renders UTC time directly: `T14:30:00Z` → `2:30 PM` — no timezone conversion applied
- This is the correct representation of the stored value on the server side
- Note: Forms Angular SPA would show this as local time (e.g., `11:30 AM` in BRT) — that cross-layer discrepancy is a DB-6 concern, not a DB-2 issue
- The dashboard accurately shows what the database contains
