# TC-8B-A-empty — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-8B-A-empty.md](../test-cases/tc-8B-A-empty.md) | **Summary**: [summary](../summaries/tc-8B-A-empty.md)

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

| Step # | Expected      | Actual        | Match |
| ------ | ------------- | ------------- | ----- |
| raw    | `""`          | `""`          | PASS  |
| GDOC   | `undefined`   | `undefined`   | PASS  |
| typeof | `"undefined"` | `"undefined"` | PASS  |
| falsy  | `true`        | `true`        | PASS  |

## Outcome

**PASS** — Empty Config A GDOC returns undefined (falsy, safe).

## Findings

- GDOC returns undefined for empty date-only fields
- Same as 8B-D-empty behavior
- Safe for developer `if (!d)` checks — no need for explicit null/undefined comparison
