# TC-8B-C-IST — Run 1 | 2026-04-03 | IST | PASS

**Spec**: [tc-8B-C-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-8B-C-IST.md) | **Summary**: [summary](../summaries/tc-8B-C-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-03                                   |
| Browser     | Chromium (Playwright headless)               |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                                                 | Result                                                      |
| ------------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                 | `"...GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                             | `false` → V1 active ✓                                       |
| Field lookup | filter enableTime=true, ignoreTimezone=false, useLegacy=false, enableInitialValue=false | `["Field6"]` ✓                                              |

## Step Results

| Step # | Expected                                 | Actual                                                      | Match |
| ------ | ---------------------------------------- | ----------------------------------------------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"`                  | `"2026-03-15T00:00:00"`                                     | PASS  |
| str    | Contains `Mar 15 2026 00:00:00 GMT+0530` | `"Sun Mar 15 2026 00:00:00 GMT+0530 (India Standard Time)"` | PASS  |
| iso    | `"2026-03-14T18:30:00.000Z"`             | `"2026-03-14T18:30:00.000Z"`                                | PASS  |

## Outcome

**PASS** — Config C DateTime GDOC in IST. Day crossing correct (Mar 14 18:30Z). No Bug #7 for DateTime.

## Findings

- DateTime configs store correctly in IST — no Bug #7
- GDOC and GFV agree on real UTC
- Day crossing in toISOString is expected and correct (Mar 15 00:00 IST = Mar 14 18:30 UTC)
