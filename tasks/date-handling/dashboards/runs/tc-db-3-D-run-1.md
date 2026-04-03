# TC-DB-3-D — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-3-D.md](../test-cases/tc-db-3-D.md) | **Summary**: [summary](../summaries/tc-db-3-D.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-02                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | WS-1 record creation + Playwright headless Chrome verification              |
| Page Size      | 200                                                                         |
| Total Records  | 272                                                                         |
| Test Record    | DateTest-001079 (WS-1, input `"2026-03-14T21:00:00"`, Config D)             |

## Step Results

| Step # | Expected                                               | Actual                             | Match |
| ------ | ------------------------------------------------------ | ---------------------------------- | ----- |
| 1      | Dashboard loaded, test record visible                  | Grid loaded, DateTest-001079 found | PASS  |
| 2      | `"3/14/2026 9:00 PM"` — Bug #5 drift, 1 BRT round-trip | `"3/14/2026 9:00 PM"`              | PASS  |

## Outcome

**PASS** — Bug #5 fake Z drift propagates to dashboard. Field5 shows `3/14/2026 9:00 PM` — midnight shifted -3h to 9 PM on the previous day after one `GetFieldValue→SetFieldValue` round-trip in BRT.

## Findings

- Bug #5 drift is cumulative: each round-trip shifts -3h (BRT) or +5:30h (IST)
- After 1 BRT round-trip: midnight → 9:00 PM March 14 (date changed!)
- After 8 BRT round-trips: a full 24h backward (one complete day lost)
- The dashboard exposes this progressive corruption clearly
