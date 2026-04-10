# TC-DB-1-E — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-1-E.md](tasks/date-handling/dashboards/test-cases/tc-db-1-E.md) | **Summary**: [summary](../summaries/tc-db-1-E.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-02                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | Playwright headless Chrome                                                  |
| Page Size      | 200                                                                         |
| Total Records  | 267                                                                         |

## Step Results

| Step # | Expected                                            | Actual                | Match |
| ------ | --------------------------------------------------- | --------------------- | ----- |
| 1      | Dashboard loaded, target record visible             | Grid loaded, 200 rows | PASS  |
| 2      | `"3/15/2026"` — M/D/YYYY, no time, no leading zeros | `"3/15/2026"`         | PASS  |
| 3      | `"3/15/2026"` — same M/D/YYYY format                | `"3/15/2026"`         | PASS  |

## Outcome

**PASS** — Field12 (Config E, legacy date-only) displays in M/D/YYYY format without time component.

## Findings

- Format matches expected `M/D/YYYY` pattern — identical to Config A (Field7) and Config B (Field10)
- 5 records sampled: DateTest-000899, DateTest-000889, DateTest-000525, DateTest-000477, DateTest-000471 — all show `3/15/2026`
- useLegacy=true has no effect on server-side display format for date-only fields
- All sampled values are consistent (`3/15/2026`) — no Bug #7 shifted dates observed in this field's sample
