# TC-DB-3-E — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-3-E.md](tasks/date-handling/dashboards/test-cases/tc-db-3-E.md) | **Summary**: [summary](../summaries/tc-db-3-E.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-02                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | WS-1 record creation + Playwright headless Chrome verification              |
| Page Size      | 200                                                                         |
| Total Records  | 272                                                                         |
| Test Record    | DateTest-001077 (same record as db-3-A)                                     |

## Step Results

| Step # | Expected                                  | Actual                             | Match |
| ------ | ----------------------------------------- | ---------------------------------- | ----- |
| 1      | Dashboard loaded, test record visible     | Grid loaded, DateTest-001077 found | PASS  |
| 2      | `"3/14/2026"` — Bug #7, legacy flag inert | `"3/14/2026"`                      | PASS  |

## Outcome

**PASS** — Bug #7 wrong date propagates for legacy Config E. `useLegacy=true` has no protective effect on date-only storage.

## Findings

- Legacy flag (`useLegacy=true`) does not affect date-only storage — same Bug #7 behavior as non-legacy Config A
- All 4 date-only configs (A, B, E, F) on DateTest-001077 show identical `3/14/2026` — flags are irrelevant
