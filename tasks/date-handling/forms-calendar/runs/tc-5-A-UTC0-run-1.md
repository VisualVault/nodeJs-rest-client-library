# TC-5-A-UTC0 — Run 1 | 2026-04-03 | UTC0 | PASS

**Spec**: [tc-5-A-UTC0.md](../test-cases/tc-5-A-UTC0.md) | **Summary**: [summary](../summaries/tc-5-A-UTC0.md)

## Environment

| Parameter   | Value                                       |
| ----------- | ------------------------------------------- |
| Date        | 2026-04-03                                  |
| Tester TZ   | Etc/GMT — UTC+0 (GMT)                       |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform    | VisualVault FormViewer, Build 20260304.1    |
| Test Method | Playwright CLI (`timezoneId: Etc/GMT`)      |

## Preconditions Verified

| Check        | Command                                                                              | Result                                                                            |
| ------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                              | `"Fri Apr 03 2026 19:34:44 GMT+0000 (Greenwich Mean Time)"` — contains GMT+0000 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                          | `false` → V1 active ✓                                                             |
| Field lookup | filter by enableTime=false, ignoreTZ=false, useLegacy=false, enableInitialValue=true | `Field2` with initialDate `"2026-03-01T03:00:00Z"` ✓                              |

## Step Results

| Step # | Expected                                                   | Actual                                     | Match |
| ------ | ---------------------------------------------------------- | ------------------------------------------ | ----- |
| 2      | Display: `03/01/2026`                                      | `03/01/2026` (rawLocal = `"3/1/2026"`)     | PASS  |
| 3      | Raw `.toISOString()` = `"2026-03-01T00:00:00.000Z"`        | `"2026-03-01T00:00:00.000Z"` (Date object) | PASS  |
| 4      | GFV = Date `.toISOString()` = `"2026-03-01T00:00:00.000Z"` | `"2026-03-01T00:00:00.000Z"` (Date object) | PASS  |
| 5      | Save extraction = `"2026-03-01"`                           | `"2026-03-01"` (substring(0,10) of ISO)    | PASS  |
| 6      | isoRef = `"2026-03-01T00:00:00.000Z"`                      | `"2026-03-01T00:00:00.000Z"`               | PASS  |

## Outcome

**PASS** — Config A preset date loads correctly at UTC+0. This is the Bug #7 boundary: local midnight = UTC midnight, so no date shift occurs.

## Findings

- Raw Date at UTC midnight: `"2026-03-01T00:00:00.000Z"`. UTC date = March 1. Save extraction correct.
- This is the boundary between Bug #7-safe (UTC-) and Bug #7-destructive (UTC+). At UTC+0, `moment(stripped).startOf('day').toDate()` → UTC midnight → correct date. At UTC+0:01, the UTC date would still be correct. Only at UTC+N (N>0) does the date shift to the previous day.
- Completes the UTC0 control for Config A presets alongside 5-A-BRT (PASS) and 5-A-IST (FAIL).
