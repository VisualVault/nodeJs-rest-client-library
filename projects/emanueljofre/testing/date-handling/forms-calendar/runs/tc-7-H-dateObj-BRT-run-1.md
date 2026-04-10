# TC-7-H-dateObj-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-7-H-dateObj-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-7-H-dateObj-BRT.md) | **Summary**: [summary](../summaries/tc-7-H-dateObj-BRT.md)

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
| Field lookup | filter snippet                                              | `["Field13"]` ✓                                                                      |

## Step Results

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| api    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — Config H dateObj stores correctly in BRT. Date object stores local midnight. No fake Z on GFV. Compare Config D dateObj which adds fake Z (Bug #5).

## Findings

- Date object stores local midnight. No fake Z on GFV. Compare Config D dateObj which adds fake Z (Bug #5).
