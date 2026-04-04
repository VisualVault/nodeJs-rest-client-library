# TC-7-A-isoNoZ — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-7-A-isoNoZ.md](../test-cases/tc-7-A-isoNoZ.md) | **Summary**: [summary](../summaries/tc-7-A-isoNoZ.md)

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

**PASS** — ISO string without Z `"2026-03-15T00:00:00"` parsed as local midnight. Time component stripped for date-only Config A. Correct date stored.

## Findings

- ISO without Z treated as local time by `moment()` — safe for date-only fields in BRT.
- Time component `T00:00:00` is stripped by `getSaveValue()` for `enableTime=false` fields.
- Same result as date string (`7-A-dateOnly`) and ISO+Z (`7-A-isoZ`) — all formats converge for Config A BRT.
