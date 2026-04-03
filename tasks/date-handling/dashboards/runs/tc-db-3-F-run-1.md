# TC-DB-3-F — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-3-F.md](../test-cases/tc-db-3-F.md) | **Summary**: [summary](../summaries/tc-db-3-F.md)

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

| Step # | Expected                                 | Actual                             | Match |
| ------ | ---------------------------------------- | ---------------------------------- | ----- |
| 1      | Dashboard loaded, test record visible    | Grid loaded, DateTest-001077 found | PASS  |
| 2      | `"3/14/2026"` — Bug #7, both flags inert | `"3/14/2026"`                      | PASS  |

## Outcome

**PASS** — Bug #7 propagates for Config F. Neither `ignoreTZ=true` nor `useLegacy=true` protects date-only fields.

## Findings

- Config F combines both flags (ignoreTZ + useLegacy) — still identical Bug #7 behavior
- Confirms: date-only Bug #7 is flag-independent, affecting all 4 date-only configs equally
