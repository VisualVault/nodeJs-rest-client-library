# TC-DB-1-G — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-1-G.md](tasks/date-handling/dashboards/test-cases/tc-db-1-G.md) | **Summary**: [summary](../summaries/tc-db-1-G.md)

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

| Step # | Expected                                                    | Actual                 | Match |
| ------ | ----------------------------------------------------------- | ---------------------- | ----- |
| 1      | Dashboard loaded, target record visible                     | Grid loaded, 200 rows  | PASS  |
| 2      | `"3/15/2026 12:00 AM"` — M/D/YYYY H:MM AM/PM, 12-hour clock | `"3/15/2026 12:00 AM"` | PASS  |
| 3      | `"3/15/2026 2:30 PM"` — same M/D/YYYY H:MM AM/PM format     | `"3/15/2026 2:30 PM"`  | PASS  |

## Outcome

**PASS** — Field14 (Config G, legacy DateTime) displays in M/D/YYYY H:MM AM/PM format with 12-hour clock.

## Findings

- Format matches expected `M/D/YYYY H:MM AM/PM` pattern — identical to Config C (Field6) and Config D (Field5)
- 4 records sampled: DateTest-000898 (`3/15/2026 12:00 AM`), DateTest-000890 (`3/15/2026 2:30 PM`), DateTest-000524 (`3/15/2026 12:00 AM`), DateTest-000476 (`3/15/2026 12:00 AM`)
- useLegacy=true has no effect on server-side DateTime display format
- Confirms: only enableTime=true/false determines server-side format (M/d/yyyy vs M/d/yyyy h:mm tt)
