# TC-3-A-BRT-IST — Run 2 | 2026-04-01 | IST | PASS

**Spec**: [tc-3-A-BRT-IST.md](../test-cases/tc-3-A-BRT-IST.md) | **Summary**: [summary](../summaries/tc-3-A-BRT-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-04-01                                  |
| Tester TZ | `Asia/Calcutta` — UTC+5:30 (IST)            |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                                                     | Result                                                                            |
| ------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                     | `"Wed Apr 01 2026 04:49:01 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                 | `false` → V1 active ✓                                                             |
| Field lookup | filter by enableTime=false, ignoreTimezone=false, useLegacy=false, enableInitialValue=false | `["DataField7"]` ✓                                                                |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| 1      | All P1–P6 checks pass        | All P1–P6 checks pass        | PASS  |
| 2      | `DateTest-000080 Rev 2`      | `DateTest-000080 Rev 2`      | PASS  |
| 3      | `03/15/2026`                 | `03/15/2026`                 | PASS  |
| 4      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 5      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 6      | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS  |

## Outcome

**PASS** — Config A date-only string `"2026-03-15"` survives BRT→IST cross-TZ reload on fresh record (DateTest-000080). All steps match expected.

## Findings

- Confirms Run 1 result: Bug #7 does NOT fire on the form load path for date-only strings. Raw, GFV, and display all correct on IST reload.
- This run uses a fresh BRT-saved record (DateTest-000080, saved 2026-03-31 BRT) instead of the old DateTest-000004. Result is identical — the finding is reproducible.
- Run 1 used DateTest-000004 Rev 1 (old record); Run 2 uses DateTest-000080 Rev 2 (fresh record). Both PASS.
