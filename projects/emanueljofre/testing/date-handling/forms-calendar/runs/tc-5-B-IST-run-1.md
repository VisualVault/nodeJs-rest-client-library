# TC-5-B-IST — Run 1 | 2026-04-03 | IST | FAIL-3

**Spec**: [tc-5-B-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-5-B-IST.md) | **Summary**: [summary](../summaries/tc-5-B-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-03                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer, Build 20260304.1     |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                                                   | Result                                                                            |
| ------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                   | `"Sat Apr 04 2026 00:48:15 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                               | `false` → V1 active ✓                                                             |
| Field lookup | filter by enableTime=false, ignoreTimezone=true, useLegacy=false, enableInitialValue=true | `Field27` with initialDate `"2026-03-01T11:38:37.141Z"` ✓                         |

## Step Results

| Step # | Expected                                     | Actual                                                 | Match    |
| ------ | -------------------------------------------- | ------------------------------------------------------ | -------- |
| 2      | Display: `03/01/2026`                        | `03/01/2026` (rawLocal = `"3/1/2026"`)                 | PASS     |
| 3      | Raw `.toISOString()` contains `"2026-03-01"` | `"2026-02-28T18:30:00.000Z"` (Date object, **Feb 28**) | **FAIL** |
| 4      | GFV = `"2026-03-01"`                         | Date `.toISOString()` = `"2026-02-28T18:30:00.000Z"`   | **FAIL** |
| 5      | Save extraction = `"2026-03-01"`             | `"2026-02-28"` (substring(0,10) of Feb 28 ISO)         | **FAIL** |
| 6      | isoRef = `"2026-02-28T18:30:00.000Z"`        | `"2026-02-28T18:30:00.000Z"`                           | PASS     |

## Outcome

**FAIL-3** — Bug #7 confirmed: preset Date object has wrong UTC date. Display shows `03/01/2026` (correct IST local) but raw Date is at IST midnight = `"2026-02-28T18:30:00.000Z"` (Feb 28 UTC). Save extraction would store `"2026-02-28"`.

## Findings

- **Bug #7 confirmed on preset init path for Config B.** `parseDateString(initialDate, false, true)` → strips Z → `moment("2026-03-01T11:38:37.141")` parses as IST local → `.startOf('day')` → IST midnight March 1 = `2026-02-28T18:30:00.000Z`. UTC date is Feb 28.
- **`ignoreTimezone=true` provides no protection.** Bug #3 hardcodes `ignoreTimezone=true` for ALL presets regardless of field config. Config B already has `ignoreTimezone=true`, so the hardcoded value is redundant — but the result is the same: the date-only preset still goes through `moment(stripped).startOf('day').toDate()` which hits Bug #7.
- Same behavior as 5-A-IST (Config A) — confirms Bug #7 is config-independent for date-only presets in UTC+.
- GFV returns a **Date object** (not string) for date-only preset fields before save — `apiType` was `Date`. The serialized form is the same wrong ISO string.
- Display (`rawLocal = "3/1/2026"`) is correct — `.toLocaleDateString()` shows the IST date. The corruption is only visible through `.toISOString()` and save extraction.
