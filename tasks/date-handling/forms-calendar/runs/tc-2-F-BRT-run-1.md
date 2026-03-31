# TC-2-F-BRT — Run 1 | 2026-03-31 | BRT | PASS

**Spec**: [tc-2-F-BRT.md](../test-cases/tc-2-F-BRT.md) | **Summary**: [summary](../summaries/tc-2-F-BRT.md)

## Environment

| Parameter | Value                                          |
| --------- | ---------------------------------------------- |
| Date      | 2026-03-31                                     |
| Tester TZ | America/Sao_Paulo — UTC-3 (BRT)                |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`)    |
| Platform  | VisualVault FormViewer, Build 20260304.1       |
| Form      | DateTest-000075 (fresh instance from template) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 16:02:38 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["DataField11"]` ✓                                                                  |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| 3      | Field displays `03/15/2026`  | Field displays `03/15/2026`  | PASS  |
| 5      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 6      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 7      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Config F typed input stores date-only string `"2026-03-15"` correctly in BRT. No date shift (Bug #7 absent at UTC-3). GetFieldValue returns raw value unchanged (no Bug #5 — date-only field outside Bug #5 surface).

## Findings

- Actual matches matrix prediction (`"2026-03-15"`) — prediction confirmed
- Bug #7 absent: BRT (UTC-3) midnight = same UTC day, no date shift on date-only storage
- Bug #2 confirmed by comparison: popup (1-F-BRT) stores `"2026-03-15T03:00:00.000Z"`, typed stores `"2026-03-15"` — same intended date, different storage format
- Identical behavior to 2-E-BRT (Config E): `ignoreTimezone=true` has no effect on legacy date-only typed input path — both E and F store `"2026-03-15"` via `getSaveValue(enableTime=false)`
- No sibling corrections needed — F-BRT was the last PENDING BRT typed-input legacy slot
