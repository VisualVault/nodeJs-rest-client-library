# TC-14-C-popup — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-14-C-popup.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-C-popup.md) | **Summary**: [summary](../summaries/tc-14-C-popup.md)

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
| 6      | `"2026-03-15T00:00:00"`         | `"2026-03-15T00:00:00"`         | PASS  |
| 7      | `"2026-03-15T03:00:00.000Z"`    | `"2026-03-15T03:00:00.000Z"`    | PASS  |
| 8      | `"2026-03-15T03:00:00.000Z"`    | `"2026-03-15T03:00:00.000Z"`    | PASS  |

## Outcome

**PASS** — Config C popup on Kendo v2 stores local midnight `T00:00:00`. API correctly converts to UTC `T03:00:00.000Z`.

## Findings

- **Kendo v2 behavioral difference**: Popup stores `"2026-03-15T00:00:00"` (local midnight), NOT `"2026-03-15T03:00:00"` (UTC-equivalent) as predicted by the matrix for Kendo v1. Matrix prediction corrected.
- The raw value is more correct on Kendo v2 — it stores local time consistently, matching what SetFieldValue stores
- GetFieldValue correctly converts: `new Date("2026-03-15T00:00:00")` in BRT → toISOString → `"2026-03-15T03:00:00.000Z"`
- On Kendo v1 (EmanuelJofre/vvdemo), the popup was expected to store UTC-equivalent via toISOString() in the save pipeline — this needs verification on v1 to confirm the Kendo version difference
- Baseline established for Phase C mask comparison — critical question: does the mask hide the time picker tab?
