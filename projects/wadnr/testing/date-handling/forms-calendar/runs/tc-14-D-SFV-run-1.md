# TC-14-D-SFV — Run 1 | 2026-04-13 | BRT | FAIL-3

**Spec**: [tc-14-D-SFV.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-D-SFV.md) | **Summary**: [summary](../summaries/tc-14-D-SFV.md)

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
| Field lookup | filter enableTime=true, ignoreTimezone=true, useLegacy=false | `["Field5"]` ✓                                          |

## Step Results

| Step # | Expected                     | Actual                           | Match    |
| ------ | ---------------------------- | -------------------------------- | -------- |
| 3      | `"2026-03-15T14:30:00"`      | `"2026-03-15T14:30:00"`          | PASS     |
| 4      | `"2026-03-15T14:30:00"`      | `"2026-03-15T14:30:00.000Z"`     | **FAIL** |

## Outcome

**FAIL-3** — FORM-BUG-5 confirmed: GetFieldValue appends `.000Z` to the local time value. Raw storage is correct; only the API return is affected.

## Findings

- Raw value correct: `"2026-03-15T14:30:00"` — ignoreTZ prevents UTC conversion
- API value has fake Z: `"2026-03-15T14:30:00.000Z"` — FORM-BUG-5 active
- Expected behavior — this is the known Bug #5 (fake Z on ignoreTZ fields)
- Baseline established for Phase C mask comparison (critical: will mask + Bug #5 compound?)
