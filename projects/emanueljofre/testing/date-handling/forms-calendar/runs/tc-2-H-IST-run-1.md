# TC-2-H-IST — Run 1 | 2026-04-01 | IST | PASS

**Spec**: [tc-2-H-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-2-H-IST.md) | **Summary**: [summary](../summaries/tc-2-H-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-04-01                                  |
| Tester TZ | Asia/Calcutta — UTC+5:30 (IST)              |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                            |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Wed Apr 01 2026 00:00:32 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | filter snippet                                              | `["DataField13"]` ✓                                                               |

## Step Results

| Step # | Expected                          | Actual                       | Match |
| ------ | --------------------------------- | ---------------------------- | ----- |
| 3      | `"03/15/2026 12:00 AM"` (display) | `"03/15/2026 12:00 AM"`      | PASS  |
| 5      | `"2026-03-15T00:00:00"`           | `"2026-03-15T00:00:00"`      | PASS  |
| 6      | `"2026-03-15T00:00:00"`           | `"2026-03-15T00:00:00"`      | PASS  |
| 7      | `"2026-03-14T18:30:00.000Z"`      | `"2026-03-14T18:30:00.000Z"` | PASS  |

## Outcome

**PASS** — All steps match expected. Legacy DateTime typed input stores local midnight `"2026-03-15T00:00:00"` (correct format). No FAIL conditions triggered.

## Findings

- Matrix prediction `"2026-03-14T18:30:00"` was wrong — actual stored value is `"2026-03-15T00:00:00"` (local midnight, not UTC-equivalent). The typed path for legacy DateTime fields uses `getSaveValue()` which formats using local time components, not by stripping Z from `toISOString()`.
- Bug #2 confirmed: popup (tc-1-H-IST) stored `"2026-03-14T18:30:00.000Z"` (raw UTC with Z) while typed input stores `"2026-03-15T00:00:00"` (local midnight without Z). Same logical datetime, completely different format and representation. Popup bypasses `getSaveValue()`; typed path goes through it.
- GetFieldValue returns `"2026-03-15T00:00:00"` — same as raw. No fake Z appended (useLegacy=true bypasses the Bug #5 code path in `getCalendarFieldValue()`). Correct behavior.
- Knock-on: 2-G-IST matrix prediction `"2026-03-14T18:30:00"` is also wrong — should be `"2026-03-15T00:00:00"` (same typed path, `ignoreTimezone` has no effect on `getSaveValue()` output). Updated in matrix.
- Recommended next action: Run 2-G-IST to confirm Config G typed stores the same as Config H (verifying `ignoreTimezone` is a no-op on typed path too).
