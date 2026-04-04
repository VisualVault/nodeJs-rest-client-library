# TC-8B-E-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-8B-E-BRT.md](../test-cases/tc-8B-E-BRT.md) | **Summary**: [summary](../summaries/tc-8B-E-BRT.md)

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

| Check        | Command                                                                                 | Result                                                         |
| ------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                 | `"...GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                             | `false` → V1 active ✓                                          |
| Field lookup | filter enableTime=false, ignoreTimezone=false, useLegacy=true, enableInitialValue=false | `["Field12"]` ✓                                                |

## Step Results

| Step # | Expected                                 | Actual                                                         | Match |
| ------ | ---------------------------------------- | -------------------------------------------------------------- | ----- |
| raw    | `"2026-03-15"`                           | `"2026-03-15"`                                                 | PASS  |
| str    | Contains `Mar 15 2026 00:00:00 GMT-0300` | `"Sun Mar 15 2026 00:00:00 GMT-0300 (Brasilia Standard Time)"` | PASS  |
| iso    | `"2026-03-15T03:00:00.000Z"`             | `"2026-03-15T03:00:00.000Z"`                                   | PASS  |

## Outcome

**PASS** — Legacy date-only Config E GDOC identical to Config A.

## Findings

- useLegacy has no effect on date-only GDOC
- All date-only configs produce identical GDOC behavior in BRT
- Config E and Config A are indistinguishable at the GDOC level
