# TC-8B-A-UTC0 — Run 1 | 2026-04-03 | UTC0 | PASS

**Spec**: [tc-8B-A-UTC0.md](../test-cases/tc-8B-A-UTC0.md) | **Summary**: [summary](../summaries/tc-8B-A-UTC0.md)

## Environment

| Parameter   | Value                                       |
| ----------- | ------------------------------------------- |
| Date        | 2026-04-03                                  |
| Browser     | Chromium (Playwright headless)              |
| Tester TZ   | Etc/GMT — UTC+0                             |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform    | VisualVault FormViewer                      |
| Test Method | Playwright CLI (`timezoneId: Etc/GMT`)      |

## Preconditions Verified

| Check        | Command                                                                                  | Result                                                      |
| ------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                  | `"...GMT+0000 (Greenwich Mean Time)"` — contains GMT+0000 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                              | `false` → V1 active ✓                                       |
| Field lookup | filter enableTime=false, ignoreTimezone=false, useLegacy=false, enableInitialValue=false | `["Field7"]` ✓                                              |

## Step Results

| Step # | Expected                                 | Actual                                                      | Match |
| ------ | ---------------------------------------- | ----------------------------------------------------------- | ----- |
| raw    | `"2026-03-15"`                           | `"2026-03-15"`                                              | PASS  |
| str    | Contains `Mar 15 2026 00:00:00 GMT+0000` | `"Sun Mar 15 2026 00:00:00 GMT+0000 (Greenwich Mean Time)"` | PASS  |
| iso    | `"2026-03-15T00:00:00.000Z"`             | `"2026-03-15T00:00:00.000Z"`                                | PASS  |

## Outcome

**PASS** — Date-only GDOC at UTC+0. toISOString = stored+Z trivially. Bug #7 absent.

## Findings

- Completes Config A 3-TZ spectrum (BRT PASS, IST FAIL Bug #7, UTC0 PASS)
- At UTC+0, local midnight = UTC midnight, so toISOString is trivially correct
- Bug #7 only manifests in positive-offset timezones (IST)
