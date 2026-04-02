# TC-DB-1-H — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-1-H.md](../test-cases/tc-db-1-H.md) | **Summary**: [summary](../summaries/tc-db-1-H.md)

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

| Step # | Expected                                                   | Actual                 | Match |
| ------ | ---------------------------------------------------------- | ---------------------- | ----- |
| 1      | Dashboard loaded, target record visible                    | Grid loaded, 200 rows  | PASS  |
| 2      | `"3/15/2026 2:30 PM"` — M/D/YYYY H:MM AM/PM, 12-hour clock | `"3/15/2026 2:30 PM"`  | PASS  |
| 3      | `"3/15/2026 12:00 AM"` — same M/D/YYYY H:MM AM/PM format   | `"3/15/2026 12:00 AM"` | PASS  |

## Outcome

**PASS** — Field13 (Config H, legacy DateTime + ignoreTZ) displays in M/D/YYYY H:MM AM/PM format with 12-hour clock.

## Findings

- Format matches expected `M/D/YYYY H:MM AM/PM` pattern — identical to all other DateTime configs (C, D, G)
- 5 records sampled: DateTest-001025 (`3/15/2026 2:30 PM`), DateTest-001024 (`3/15/2026 2:30 PM`), DateTest-001023 (`6/20/2026 9:00 AM`), DateTest-001013 (`3/15/2026 2:30 PM`), DateTest-001012 (`3/15/2026 2:30 PM`)
- useLegacy=true + ignoreTZ=true combination has no effect on server-side DateTime format
- **Key conclusion for DB-1**: All 8 configs confirmed — server format is determined solely by enableTime flag
