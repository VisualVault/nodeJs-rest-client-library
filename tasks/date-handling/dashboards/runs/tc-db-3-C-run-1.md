# TC-DB-3-C — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-3-C.md](../test-cases/tc-db-3-C.md) | **Summary**: [summary](../summaries/tc-db-3-C.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-02                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | WS-1 record creation + Playwright headless Chrome verification              |
| Page Size      | 200                                                                         |
| Total Records  | 272                                                                         |
| Test Record    | DateTest-001078 (WS-1, input `"2026-03-14T00:00:00"`, Config C)             |

## Step Results

| Step # | Expected                                           | Actual                             | Match |
| ------ | -------------------------------------------------- | ---------------------------------- | ----- |
| 1      | Dashboard loaded, test record visible              | Grid loaded, DateTest-001078 found | PASS  |
| 2      | `"3/14/2026 12:00 AM"` — Bug #7 variant, wrong day | `"3/14/2026 12:00 AM"`             | PASS  |

## Outcome

**PASS** — Bug #7 variant for DateTime fields propagates to dashboard. Field6 shows `3/14/2026 12:00 AM` when `3/15/2026` was intended.

## Findings

- DateTime Config C is affected when a date-only string is passed to `SetFieldValue` — the same `normalizeCalValue` Bug #7 mechanism fires
- Dashboard shows midnight of the wrong day: `3/14/2026 12:00 AM`
- This variant explains the `3/14/2026 12:00 AM` values observed in exploratory data for Field6
