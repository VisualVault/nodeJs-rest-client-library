# TC-14-D-GFV — Run 1 | 2026-04-13 | BRT | FAIL-3

**Spec**: [tc-14-D-GFV.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-D-GFV.md) | **Summary**: [summary](../summaries/tc-14-D-GFV.md)

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

**FAIL-3** — FORM-BUG-5 confirmed: GetFieldValue appends `.000Z` to local time. Same as 14-D-SFV — the GFV read path has the same bug.

## Findings

- Raw value unchanged from SFV: `"2026-03-15T14:30:00"`
- API value has fake Z: `"2026-03-15T14:30:00.000Z"` — FORM-BUG-5
- GFV on same form instance reads identically to SFV capture — no additional transformation
- Baseline for Phase C: will mask compound with Bug #5?
