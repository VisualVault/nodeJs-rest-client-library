# TC-7-F-dateOnly-IST — Run 1 | 2026-04-03 | IST | FAIL-1

**Spec**: [tc-7-F-dateOnly-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-7-F-dateOnly-IST.md) | **Summary**: [summary](../summaries/tc-7-F-dateOnly-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-03                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                            |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Sat Apr 04 2026 05:02:32 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | filter snippet                                              | `["Field11"]` ✓                                                                   |

## Step Results

| Step # | Expected                     | Actual                       | Match    |
| ------ | ---------------------------- | ---------------------------- | -------- |
| raw    | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| api    | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| isoRef | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Bug #7 confirmed. Neither `useLegacy` nor `ignoreTZ` protects date-only fields.

## Findings

- Bug #7 confirmed for legacy Config F in IST. Neither flag provides protection. Identical to E-IST and A-dateOnly-IST.
