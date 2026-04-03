# TC-DB-3-B — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-3-B.md](../test-cases/tc-db-3-B.md) | **Summary**: [summary](../summaries/tc-db-3-B.md)

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

| Step # | Expected                               | Actual                             | Match |
| ------ | -------------------------------------- | ---------------------------------- | ----- |
| 1      | Dashboard loaded, test record visible  | Grid loaded, DateTest-001077 found | PASS  |
| 2      | `"3/14/2026"` — Bug #7, ignoreTZ inert | `"3/14/2026"`                      | PASS  |

## Outcome

**PASS** — Bug #7 wrong date propagates identically for Config B. `ignoreTZ=true` has no protective effect on date-only fields.

## Findings

- Config B (ignoreTZ=true) shows identical Bug #7 behavior to Config A (ignoreTZ=false)
- The `ignoreTZ` flag is irrelevant at the storage layer — Bug #7 fires in `normalizeCalValue()` before any flag check
