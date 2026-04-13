# TC-14-D-popup — Run 1 | 2026-04-13 | BRT | FAIL-3

**Spec**: [tc-14-D-popup.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-D-popup.md) | **Summary**: [summary](../summaries/tc-14-D-popup.md)

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
| 6      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`          | PASS     |
| 7      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00.000Z"`     | **FAIL** |
| 8      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"`     | PASS     |

## Outcome

**FAIL-3** — FORM-BUG-5 confirmed: GetFieldValue appends `.000Z` to local midnight. Raw storage correct.

## Findings

- Raw stores local midnight correctly: `"2026-03-15T00:00:00"`
- API appends fake Z: `"2026-03-15T00:00:00.000Z"` — FORM-BUG-5
- For midnight specifically, the fake Z has no practical date impact (midnight UTC = midnight anywhere for the date portion), but it signals the API contract violation
- Same popup behavior as Config C on Kendo v2 — stores local midnight `T00:00:00`
- Baseline for Phase C: mask + popup + Bug #5 — three variables to untangle
