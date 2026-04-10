# TC-5-F-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-5-F-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-5-F-BRT.md) | **Summary**: [summary](../summaries/tc-5-F-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                  | Result                                                                               |
| ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                  | `"Fri Apr 03 2026 16:50:01 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                              | `false` → V1 active ✓                                                                |
| Field lookup | filter by enableTime=false, ignoreTimezone=true, useLegacy=true, enableInitialValue=true | `Field20` with initialDate `"2026-03-01T11:31:44.547Z"` ✓                            |

## Step Results

| Step # | Expected                                                   | Actual                                     | Match |
| ------ | ---------------------------------------------------------- | ------------------------------------------ | ----- |
| 2      | Display: `03/01/2026`                                      | `03/01/2026` (rawLocal = `"3/1/2026"`)     | PASS  |
| 3      | Raw `.toISOString()` = `"2026-03-01T03:00:00.000Z"`        | `"2026-03-01T03:00:00.000Z"` (Date object) | PASS  |
| 4      | GFV = Date `.toISOString()` = `"2026-03-01T03:00:00.000Z"` | `"2026-03-01T03:00:00.000Z"` (Date object) | PASS  |
| 5      | Save extraction = `"2026-03-01"`                           | `"2026-03-01"` (substring(0,10) of ISO)    | PASS  |
| 6      | isoRef = `"2026-03-01T03:00:00.000Z"`                      | `"2026-03-01T03:00:00.000Z"`               | PASS  |

## Outcome

**PASS** — Config F preset date loads correctly in BRT. `ignoreTZ=true` has no effect on preset path (Bug #3 hardcodes it). Identical to E-BRT and non-legacy Config B.

## Findings

- Same results as 5-E-BRT — `ignoreTZ=true` on the field is redundant because Bug #3 hardcodes `ignoreTimezone=true` for all presets regardless of field config.
- `useLegacy=true` also has no effect on the date-only preset init path.
- Both `ignoreTZ` and `useLegacy` flags are inert for date-only preset initialization. The same `parseDateString` truncation runs for all 4 date-only configs (A, B, E, F).
- No bugs active in BRT.
