# TC-2-C-IST — Run 1 | 2026-03-31 | IST | PASS

**Spec**: [tc-2-C-IST.md](../test-cases/tc-2-C-IST.md) | **Summary**: [summary](../summaries/tc-2-C-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | Asia/Calcutta — UTC+5:30 (IST)              |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                            |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 22:49:56 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | filter snippet                                              | `["DataField6"]` ✓                                                                |

## Step Results

| Step # | Expected                         | Actual                       | Match |
| ------ | -------------------------------- | ---------------------------- | ----- |
| 9      | Display: `"03/15/2026 12:00 AM"` | `"03/15/2026 12:00 AM"`      | PASS  |
| 10     | `"2026-03-15T00:00:00"`          | `"2026-03-15T00:00:00"`      | PASS  |
| 11     | `"2026-03-14T18:30:00.000Z"`     | `"2026-03-14T18:30:00.000Z"` | PASS  |
| 12     | `"2026-03-14T18:30:00.000Z"`     | `"2026-03-14T18:30:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Typed input in IST stores local midnight `"2026-03-15T00:00:00"` — identical to popup (1-C-IST) and BRT (2-C-BRT). GetFieldValue returns correct UTC conversion.

## Findings

- Actual matches correct/intended behavior — no bugs triggered for Config C typed input in IST
- Matrix prediction `"2026-03-14T18:30:00"` (UTC offset stored) was wrong; `getSaveValue()` formats as local time, confirmed by 1-C-IST popup result
- Bug #5 absent (expected — Config C has `ignoreTimezone=false`)
- Bug #7 absent (expected — Config C has `enableTime=true`)
- Bug #2 absent — typed input produces identical result to popup (1-C-IST: `"2026-03-15T00:00:00"`)
- Sibling 2-D-IST expected to show same storage but with fake Z in GFV (Bug #5)
