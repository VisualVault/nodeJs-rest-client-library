# TC-DB-1-C — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-1-C.md](../test-cases/tc-db-1-C.md) | **Summary**: [summary](../summaries/tc-db-1-C.md)

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
| 3      | `"3/15/2026 3:00 AM"` — same M/D/YYYY H:MM AM/PM format     | `"3/15/2026 3:00 AM"`  | PASS  |

## Outcome

**PASS** — Field6 (Config C, DateTime) displays in M/D/YYYY H:MM AM/PM format with 12-hour clock.

## Findings

- Format matches expected `M/D/YYYY H:MM AM/PM` pattern — 12-hour clock, AM/PM suffix, no seconds
- 5 records sampled: DateTest-001055 (`3/14/2026 12:00 AM`), DateTest-001054 (`4/14/2026 12:00 AM`), DateTest-001053 (`4/14/2026 12:00 AM`), DateTest-001052 (`4/14/2026 12:00 AM`), DateTest-001051 (`3/15/2026 12:00 AM`)
- enableTime=true correctly enables time component display
- Time values vary (12:00 AM vs 3:00 AM) reflecting mixed UTC storage — this is a DB-2/DB-3 concern
