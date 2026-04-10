# TC-DB-3-A — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-3-A.md](tasks/date-handling/dashboards/test-cases/tc-db-3-A.md) | **Summary**: [summary](../summaries/tc-db-3-A.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-02                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | WS-1 record creation + Playwright headless Chrome verification              |
| Page Size      | 200                                                                         |
| Total Records  | 272                                                                         |
| Test Record    | DateTest-001077 (WS-1, input `"2026-03-14"`, configs A,B,E,F)               |

## Step Results

| Step # | Expected                              | Actual                             | Match |
| ------ | ------------------------------------- | ---------------------------------- | ----- |
| 1      | Dashboard loaded, test record visible | Grid loaded, DateTest-001077 found | PASS  |
| 2      | `"3/14/2026"` — Bug #7 shifted date   | `"3/14/2026"`                      | PASS  |

## Outcome

**PASS** — Bug #7 wrong date propagates to the dashboard. Field7 shows `3/14/2026` (intended `3/15/2026`, shifted -1 day by IST midnight UTC conversion).

## Findings

- Dashboard faithfully displays the Bug #7 corrupted value — no server-side correction
- The wrong date is permanent once stored — visible to all users regardless of their timezone
- `normalizeCalValue()` → `moment("2026-03-15").toDate()` at IST midnight → UTC date = March 14
