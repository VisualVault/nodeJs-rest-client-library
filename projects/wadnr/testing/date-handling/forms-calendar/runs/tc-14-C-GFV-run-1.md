# TC-14-C-GFV — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-14-C-GFV.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-C-GFV.md) | **Summary**: [summary](../summaries/tc-14-C-GFV.md)

## Environment

| Parameter   | Value                                                |
| ----------- | ---------------------------------------------------- |
| Date        | 2026-04-13                                           |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                     |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)          |
| Platform    | VisualVault FormViewer, Build 20260410.1             |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`)     |

## Preconditions Verified

| Check        | Command                                                     | Result                                                     |
| ------------ | ----------------------------------------------------------- | ---------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Mon Apr 13 2026 09:50:13 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                      |
| Field lookup | filter enableTime=true, ignoreTimezone=false, useLegacy=false | `["Field6"]` ✓                                          |

## Step Results

| Step # | Expected                        | Actual                          | Match |
| ------ | ------------------------------- | ------------------------------- | ----- |
| 3      | `"2026-03-15T14:30:00"`         | `"2026-03-15T14:30:00"`         | PASS  |
| 4      | `"2026-03-15T17:30:00.000Z"`    | `"2026-03-15T17:30:00.000Z"`    | PASS  |

## Outcome

**PASS** — Config C GetFieldValue after SFV: reads the same value, API correctly converts local→UTC.

## Findings

- GFV reads the value set by 14-C-SFV on the same form instance
- Raw unchanged: `"2026-03-15T14:30:00"`
- API correctly converts: 14:30 BRT → 17:30 UTC → `"2026-03-15T17:30:00.000Z"`
- Baseline confirmed for Phase C mask comparison
