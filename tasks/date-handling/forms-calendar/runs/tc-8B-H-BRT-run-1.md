# TC-8B-H-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-8B-H-BRT.md](../test-cases/tc-8B-H-BRT.md) | **Summary**: [summary](../summaries/tc-8B-H-BRT.md)

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

| Check        | Command                                                                               | Result                                                         |
| ------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                               | `"...GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                           | `false` → V1 active ✓                                          |
| Field lookup | filter enableTime=true, ignoreTimezone=true, useLegacy=true, enableInitialValue=false | `["Field13"]` ✓                                                |

## Step Results

| Step # | Expected                                 | Actual                                                         | Match |
| ------ | ---------------------------------------- | -------------------------------------------------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"`                  | `"2026-03-15T00:00:00"`                                        | PASS  |
| str    | Contains `Mar 15 2026 00:00:00 GMT-0300` | `"Sun Mar 15 2026 00:00:00 GMT-0300 (Brasilia Standard Time)"` | PASS  |
| iso    | `"2026-03-15T03:00:00.000Z"`             | `"2026-03-15T03:00:00.000Z"`                                   | PASS  |

## Outcome

**PASS** — Legacy DateTime Config H GDOC correct. Both GDOC and GFV return correct values (GFV raw due to useLegacy, GDOC real UTC).

## Findings

- Config H GDOC.toISOString() = real UTC, GFV = raw local — both correct for their APIs
- useLegacy prevents Bug #5 on GFV; GDOC inherently avoids it
- DateTime legacy path and standard path produce identical GDOC output
