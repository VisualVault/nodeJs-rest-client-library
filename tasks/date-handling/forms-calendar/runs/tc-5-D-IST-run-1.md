# TC-5-D-IST — Run 1 | 2026-04-01 | IST | FAIL

**Spec**: [tc-5-D-IST.md](../test-cases/tc-5-D-IST.md) | **Summary**: [summary](../summaries/tc-5-D-IST.md)

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
| Field lookup | Config D preset filter                                      | `["DataField16"]` ✓   |

## Step Results

| Step # | Expected                                    | Actual                                                                        | Match    |
| ------ | ------------------------------------------- | ----------------------------------------------------------------------------- | -------- |
| 1      | Display shows correct IST date (03/01/2026) | Displays `03/01/2026` (correct local)                                         | PASS     |
| 2      | raw = Date object with correct UTC          | raw = Date `"2026-03-01T11:28:54.627Z"` (correct IST date display 03/01/2026) | PASS     |
| 3      | GFV returns uncorrupted value               | GFV = `"2026-03-01T16:58:54.627Z"` (fake Z, +5:30h shift)                     | **FAIL** |

## Outcome

**FAIL** — Bug #5 fires on preset date at form load. GFV returns a value corrupted by +5:30h shift before any user interaction. The preset Date object's raw UTC is correct (`T11:28:54.627Z`), but GetFieldValue applies the fake Z transformation, producing `T16:58:54.627Z`.

## Findings

- **Bug #5 confirmed on preset/init path for DateTime Config D**: Previously Bug #5 was confirmed only on user-input values. This proves the fake Z corruption also affects preset auto-populated DateTime fields at form load.
- **+5:30h shift matches IST offset exactly**: raw UTC `T11:28:54.627Z` → GFV `T16:58:54.627Z` = +5h30m. The `getCalendarFieldValue()` function strips the real timezone and appends a fake Z regardless of the value's origin (preset vs user input).
- **Display masks the corruption**: The form correctly shows `03/01/2026` — the user sees the right date, but any developer code calling GFV gets a corrupted value.
- **Differs from 5-A-IST pattern**: Config A (date-only) preset had Bug #7 (-1 day from `moment().toDate()`). Config D (DateTime) preset has Bug #5 (fake Z offset shift). Different bugs, same category, both on the init path.
