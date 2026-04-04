# TC-7-A-usFormatTime — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-7-A-usFormatTime.md](../test-cases/tc-7-A-usFormatTime.md) | **Summary**: [summary](../summaries/tc-7-A-usFormatTime.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Fri Apr 03 2026 19:25:04 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["Field7"]` ✓                                                                       |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| api    | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| isoRef | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — US format with time `"03/15/2026 12:00:00 AM"` parsed as local midnight. Time component stripped for date-only Config A. Same result as plain US format.

## Findings

- Time component (`12:00:00 AM`) is redundant for date-only fields — `getSaveValue()` strips it.
- Confirms that appending a time to a US format string does not change the stored date for `enableTime=false` fields.
- Identical to `7-A-usFormat` result — format processing is robust.
