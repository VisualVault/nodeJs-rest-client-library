# TC-DB-3-G — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-3-G.md](../test-cases/tc-db-3-G.md) | **Summary**: [summary](../summaries/tc-db-3-G.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-02                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | WS-1 record creation + Playwright headless Chrome verification              |
| Page Size      | 200                                                                         |
| Total Records  | 272                                                                         |
| Test Record    | DateTest-001081 (WS-1, input `"2026-03-14T18:30:00"`, Configs G,H)          |

## Step Results

| Step # | Expected                                               | Actual                             | Match |
| ------ | ------------------------------------------------------ | ---------------------------------- | ----- |
| 1      | Dashboard loaded, test record visible                  | Grid loaded, DateTest-001081 found | PASS  |
| 2      | `"3/14/2026 6:30 PM"` — IST midnight as UTC, wrong day | `"3/14/2026 6:30 PM"`              | PASS  |

## Outcome

**PASS** — Legacy popup UTC storage behavior propagates to dashboard. Field14 shows `3/14/2026 6:30 PM` — IST midnight (00:00 +5:30) stored as UTC datetime, rendering as 6:30 PM on March 14 instead of March 15.

## Findings

- Legacy popup stores `toISOString()` directly: IST midnight → `2026-03-14T18:30:00.000Z` → date shifts to March 14
- Dashboard renders UTC time directly: `18:30:00Z` → `6:30 PM`
- The resulting display (`3/14/2026 6:30 PM`) bears no resemblance to the user's intent (March 15 at midnight)
- This behavior was confirmed in Forms IST testing (TC-1-G-IST FAIL-1)
