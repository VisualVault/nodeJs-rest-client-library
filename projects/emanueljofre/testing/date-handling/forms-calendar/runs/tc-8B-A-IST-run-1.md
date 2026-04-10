# TC-8B-A-IST — Run 1 | 2026-04-03 | IST | FAIL

**Spec**: [tc-8B-A-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-8B-A-IST.md) | **Summary**: [summary](../summaries/tc-8B-A-IST.md)

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

| Check        | Command                                                                                  | Result                                                      |
| ------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                  | `"...GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                              | `false` → V1 active ✓                                       |
| Field lookup | filter enableTime=false, ignoreTimezone=false, useLegacy=false, enableInitialValue=false | `["Field7"]` ✓                                              |

## Step Results

| Step # | Expected                                 | Actual                                                      | Match |
| ------ | ---------------------------------------- | ----------------------------------------------------------- | ----- |
| raw    | `"2026-03-15"`                           | `"2026-03-14"`                                              | FAIL  |
| str    | Contains `Mar 15 2026 00:00:00 GMT+0530` | `"Sat Mar 14 2026 00:00:00 GMT+0530 (India Standard Time)"` | FAIL  |
| iso    | `"2026-03-14T18:30:00.000Z"`             | `"2026-03-13T18:30:00.000Z"`                                | FAIL  |

## Outcome

**FAIL-1** — Bug #7 upstream: SetFieldValue stores "2026-03-14" instead of "2026-03-15" for date-only in IST. GDOC correctly reads the corrupted stored value.

## Findings

- Bug #7 corrupts stored value before GDOC reads it
- GDOC itself works correctly — it faithfully returns what was stored
- Mar 14 IST midnight = 2026-03-13T18:30:00.000Z is correct for the (wrong) stored value
- The failure is in normalizeCalValue, not GetDateObjectFromCalendar
