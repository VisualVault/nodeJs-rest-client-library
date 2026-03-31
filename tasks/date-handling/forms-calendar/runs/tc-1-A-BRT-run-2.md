# TC-1-A-BRT — Run 2 | 2026-03-31 | BRT | PASS

**Spec**: [tc-1-A-BRT.md](../test-cases/tc-1-A-BRT.md) | **Summary**: [summary](../summaries/tc-1-A-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                                                     | Result                                                                               |
| ------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                     | `"Tue Mar 31 2026 18:16:43 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                 | `false` → V1 active ✓                                                                |
| Field lookup | filter by enableTime=false, ignoreTimezone=false, useLegacy=false, enableInitialValue=false | `["DataField7"]` ✓                                                                   |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| 3      | Field displays `03/15/2026`  | Field displays `03/15/2026`  | PASS  |
| 4      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 5      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 6      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Config A, BRT: date-only calendar popup stores `"2026-03-15"` correctly. GetFieldValue returns raw value without transformation. BRT (UTC-3) midnight confirms same calendar day in UTC.

## Findings

- Actual matches matrix prediction: `"2026-03-15"` — correct, consistent with run-1
- No bugs triggered: Bug #7 does not affect UTC- timezones (BRT midnight 2026-03-15 = UTC 2026-03-15T03:00Z, same calendar day)
- GetFieldValue returns raw stored value directly — no fake-Z appended (Config A has enableTime=false, outside Bug #5 scope)
- Confirms BRT baseline stability across runs (run-1 ~2026-03-27, run-2 2026-03-31)
- Form instance: DateTest-000079
