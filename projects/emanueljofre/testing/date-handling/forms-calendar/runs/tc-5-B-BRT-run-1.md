# TC-5-B-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-5-B-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-5-B-BRT.md) | **Summary**: [summary](../summaries/tc-5-B-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                   | Result                                                                               |
| ------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                   | `"Fri Apr 03 2026 16:11:29 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                               | `false` → V1 active ✓                                                                |
| Field lookup | filter by enableTime=false, ignoreTimezone=true, useLegacy=false, enableInitialValue=true | `Field27` with initialDate `"2026-03-01T11:38:37.141Z"` ✓                            |

## Step Results

| Step # | Expected                                                   | Actual                                     | Match |
| ------ | ---------------------------------------------------------- | ------------------------------------------ | ----- |
| 2      | Display: `03/01/2026`                                      | `03/01/2026` (rawLocal = `"3/1/2026"`)     | PASS  |
| 3      | Raw `.toISOString()` = `"2026-03-01T03:00:00.000Z"`        | `"2026-03-01T03:00:00.000Z"` (Date object) | PASS  |
| 4      | GFV = Date `.toISOString()` = `"2026-03-01T03:00:00.000Z"` | `"2026-03-01T03:00:00.000Z"` (Date object) | PASS  |
| 5      | Save extraction = `"2026-03-01"`                           | `"2026-03-01"` (substring(0,10) of ISO)    | PASS  |
| 6      | isoRef = `"2026-03-01T03:00:00.000Z"`                      | `"2026-03-01T03:00:00.000Z"`               | PASS  |

## Outcome

**PASS** — Config B preset date loads correctly in BRT. Date-only + ignoreTZ=true does not trigger any bugs in negative-offset timezones.

## Findings

- Raw value is a **Date object** (not a string), stored at BRT midnight (UTC 03:00). This is consistent with 5-A-BRT behavior.
- GFV also returns a Date object (not a string) for date-only preset fields before save. The `apiType` was `Date`, not `string`.
- Save extraction produces `"2026-03-01"` — correct date preserved through BRT midnight representation.
- `ignoreTZ=true` on the field has no effect on the preset init path (Bug #3 hardcodes `ignoreTimezone=true` for all presets regardless). In BRT this is invisible because the date is preserved anyway.
- `initialDate` for Field27 is `"2026-03-01T11:38:37.141Z"` (has time component), but `parseDateString` with hardcoded `enableTime=false` truncates to midnight via `.startOf('day')`.
- No bugs active. BRT control confirms Bug #7 is purely a UTC+ issue.
