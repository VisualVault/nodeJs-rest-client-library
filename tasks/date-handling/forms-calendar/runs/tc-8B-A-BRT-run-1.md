# TC-8B-A-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-8B-A-BRT.md](../test-cases/tc-8B-A-BRT.md) | **Summary**: [summary](../summaries/tc-8B-A-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Browser     | Chromium (Playwright headless)                   |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                  | Result                                                         |
| ------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                  | `"...GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                              | `false` → V1 active ✓                                          |
| Field lookup | filter enableTime=false, ignoreTimezone=false, useLegacy=false, enableInitialValue=false | `["Field7"]` ✓                                                 |

## Step Results

| Step # | Expected                                 | Actual                                                         | Match |
| ------ | ---------------------------------------- | -------------------------------------------------------------- | ----- |
| raw    | `"2026-03-15"`                           | `"2026-03-15"`                                                 | PASS  |
| str    | Contains `Mar 15 2026 00:00:00 GMT-0300` | `"Sun Mar 15 2026 00:00:00 GMT-0300 (Brasilia Standard Time)"` | PASS  |
| iso    | `"2026-03-15T03:00:00.000Z"`             | `"2026-03-15T03:00:00.000Z"`                                   | PASS  |

## Outcome

**PASS** — Date-only Config A GDOC returns correct Date at BRT midnight. toISOString gives real UTC (+3h).

## Findings

- GDOC creates Date from "2026-03-15" at local midnight BRT
- Date-only GDOC is config-agnostic for date-only fields in BRT (same as Config E)
- toISOString returns real UTC, safe for further processing
