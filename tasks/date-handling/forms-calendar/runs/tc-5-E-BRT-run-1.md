# TC-5-E-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-5-E-BRT.md](../test-cases/tc-5-E-BRT.md) | **Summary**: [summary](../summaries/tc-5-E-BRT.md)

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
| TZ           | `new Date().toString()`                                                                   | `"Fri Apr 03 2026 16:50:01 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                               | `false` → V1 active ✓                                                                |
| Field lookup | filter by enableTime=false, ignoreTimezone=false, useLegacy=true, enableInitialValue=true | `Field19` with initialDate `"2026-03-01T11:31:09.996Z"` ✓                            |

## Step Results

| Step # | Expected                                                   | Actual                                     | Match |
| ------ | ---------------------------------------------------------- | ------------------------------------------ | ----- |
| 2      | Display: `03/01/2026`                                      | `03/01/2026` (rawLocal = `"3/1/2026"`)     | PASS  |
| 3      | Raw `.toISOString()` = `"2026-03-01T03:00:00.000Z"`        | `"2026-03-01T03:00:00.000Z"` (Date object) | PASS  |
| 4      | GFV = Date `.toISOString()` = `"2026-03-01T03:00:00.000Z"` | `"2026-03-01T03:00:00.000Z"` (Date object) | PASS  |
| 5      | Save extraction = `"2026-03-01"`                           | `"2026-03-01"` (substring(0,10) of ISO)    | PASS  |
| 6      | isoRef = `"2026-03-01T03:00:00.000Z"`                      | `"2026-03-01T03:00:00.000Z"`               | PASS  |

## Outcome

**PASS** — Legacy date-only preset correct in BRT. Behavior identical to non-legacy Config A.

## Findings

- `parseDateString` with hardcoded `enableTime=false` truncates to BRT midnight (`2026-03-01T03:00:00.000Z`). UTC date preserved because BRT midnight is still March 1 in UTC.
- `useLegacy=true` has no effect on the date-only preset init path — both legacy and non-legacy go through the same `parseDateString` truncation.
- GFV returns raw Date unchanged (legacy path bypasses `getCalendarFieldValue` transformations).
- No bugs active in BRT. Identical to 5-A-BRT (Config A) and 5-B-BRT (Config B).
