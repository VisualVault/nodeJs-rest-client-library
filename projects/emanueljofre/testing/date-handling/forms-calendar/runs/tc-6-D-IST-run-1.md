# TC-6-D-IST — Run 1 | 2026-04-01 | IST | FAIL

**Spec**: [tc-6-D-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-6-D-IST.md) | **Summary**: [summary](../summaries/tc-6-D-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-01                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                     | Result                |
| ------------ | ----------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                     | Contains GMT+0530 ✓   |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓ |
| Field lookup | Config D currentDate filter                                 | `["DataField18"]` ✓   |

## Step Results

| Step # | Expected                                     | Actual                                                                 | Match    |
| ------ | -------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| 1      | Display shows correct IST today (04/02/2026) | Displays `04/02/2026` (correct IST date)                               | PASS     |
| 2      | raw = Date object with correct UTC           | raw = Date `"2026-04-02T00:39:22.750Z"` (correct IST today 04/02/2026) | PASS     |
| 3      | GFV returns uncorrupted value                | GFV = `"2026-04-02T06:09:22.750Z"` (fake Z, +5:30h shift)              | **FAIL** |

## Outcome

**FAIL** — Bug #5 fires on current date auto-populated field at form load. GFV returns `T06:09:22.750Z` instead of the raw `T00:39:22.750Z` — shifted by exactly +5:30h (IST offset).

## Findings

- **Bug #5 confirmed on current date init path**: Identical pattern to 5-D-IST (preset). The `getCalendarFieldValue()` fake Z transformation fires on all Config D DateTime values regardless of origin — user input, preset, or current date.
- **+5:30h shift consistent**: raw `T00:39:22.750Z` → GFV `T06:09:22.750Z` = +5h30m exactly. The fake Z mechanism is deterministic and offset-proportional.
- **IST date boundary note**: The form loaded on IST 04/02/2026 (after midnight IST), showing the current date includes the IST day, which is already April 2 while UTC is still April 1. The raw Date correctly reflects this.
- **Bug #5 scope now fully proven on init paths**: Both preset (5-D-IST) and current date (6-D-IST) produce fake Z corruption. Combined with user-input evidence (Cat 1, 2, 7, 8, 9), Bug #5 affects all value origins for Config D.
