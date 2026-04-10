# TC-DB-1-D — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-1-D.md](tasks/date-handling/dashboards/test-cases/tc-db-1-D.md) | **Summary**: [summary](../summaries/tc-db-1-D.md)

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
| 3      | `"3/15/2026 2:00 AM"` — same M/D/YYYY H:MM AM/PM format     | `"3/15/2026 2:00 AM"`  | PASS  |

## Outcome

**PASS** — Field5 (Config D, DateTime + ignoreTZ) displays in M/D/YYYY H:MM AM/PM format with 12-hour clock.

## Findings

- Format matches expected `M/D/YYYY H:MM AM/PM` pattern — identical format to Config C (Field6)
- 5 records sampled: DateTest-001073 (`3/15/2026 2:00 AM`), DateTest-001072 (`3/15/2026 12:00 AM`), DateTest-001022 (`3/15/2026 2:30 PM`), DateTest-001021 (`3/15/2026 2:30 PM`), DateTest-001020 (`6/20/2026 9:00 AM`)
- ignoreTZ=true has no effect on server-side display format, confirming analysis.md § 2
- Time values vary across records — reflects different write-path storage; DB-2 concern
