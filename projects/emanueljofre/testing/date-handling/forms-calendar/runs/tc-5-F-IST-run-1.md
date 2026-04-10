# TC-5-F-IST — Run 1 | 2026-04-03 | IST | FAIL-3

**Spec**: [tc-5-F-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-5-F-IST.md) | **Summary**: [summary](../summaries/tc-5-F-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-03                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer, Build 20260304.1     |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                                                  | Result                                                                            |
| ------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                  | `"Sat Apr 04 2026 01:20:49 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                              | `false` → V1 active ✓                                                             |
| Field lookup | filter by enableTime=false, ignoreTimezone=true, useLegacy=true, enableInitialValue=true | `Field20` with initialDate `"2026-03-01T11:31:44.547Z"` ✓                         |

## Step Results

| Step # | Expected                                     | Actual                                                 | Match    |
| ------ | -------------------------------------------- | ------------------------------------------------------ | -------- |
| 2      | Display: `03/01/2026`                        | `03/01/2026` (rawLocal = `"3/1/2026"`)                 | PASS     |
| 3      | Raw `.toISOString()` contains `"2026-03-01"` | `"2026-02-28T18:30:00.000Z"` (Date object, **Feb 28**) | **FAIL** |
| 4      | GFV = `"2026-03-01"`                         | Date `.toISOString()` = `"2026-02-28T18:30:00.000Z"`   | **FAIL** |
| 5      | Save extraction = `"2026-03-01"`             | `"2026-02-28"` (substring(0,10) of Feb 28 ISO)         | **FAIL** |
| 6      | isoRef = `"2026-02-28T18:30:00.000Z"`        | `"2026-02-28T18:30:00.000Z"`                           | PASS     |

## Outcome

**FAIL-3** — Bug #7 confirmed. Neither `ignoreTZ=true` nor `useLegacy=true` protects the preset path. Bug #3 hardcodes `ignoreTimezone=true` for all presets. Same behavior as non-legacy 5-B-IST.

## Findings

- **Bug #7 confirmed for legacy Config F in IST.** Same `parseDateString` path as E-IST — `ignoreTZ=true` on the field is redundant because Bug #3 already hardcodes it.
- Neither `ignoreTZ=true` nor `useLegacy=true` protects date-only preset initialization from Bug #7. The bug fires in `parseDateString` which is shared by all 4 date-only configs (A, B, E, F).
- All 4 date-only preset configs now confirmed with identical Bug #7 behavior in IST: 5-A-IST, 5-B-IST, 5-E-IST, 5-F-IST. The bug is completely config-independent for date-only presets.
- Display correct (`03/01/2026`), internal Date wrong (`Feb 28 UTC`), save extraction wrong (`"2026-02-28"`).
