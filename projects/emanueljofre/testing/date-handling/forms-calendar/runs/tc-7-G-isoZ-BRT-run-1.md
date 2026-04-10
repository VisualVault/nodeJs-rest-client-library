# TC-7-G-isoZ-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-7-G-isoZ-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-7-G-isoZ-BRT.md) | **Summary**: [summary](../summaries/tc-7-G-isoZ-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Fri Apr 03 2026 20:31:33 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["Field14"]` ✓                                                                      |

## Step Results

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| raw    | `"2026-03-14T21:00:00"` | `"2026-03-14T21:00:00"` | PASS  |
| api    | `"2026-03-14T21:00:00"` | `"2026-03-14T21:00:00"` | PASS  |

## Outcome

**PASS** — Config G isoZ stores correctly in BRT. UTC→local shift correct. GFV returns raw (no UTC reconversion like Config C).

## Findings

- UTC→local shift correct. GFV returns raw (no UTC reconversion like Config C). Key G vs C comparison.
