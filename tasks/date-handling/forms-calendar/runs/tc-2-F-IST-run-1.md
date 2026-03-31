# TC-2-F-IST — Run 1 | 2026-03-31 | IST | FAIL-1

**Spec**: [tc-2-F-IST.md](../test-cases/tc-2-F-IST.md) | **Summary**: [summary](../summaries/tc-2-F-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | Asia/Calcutta — UTC+5:30 (IST)              |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                                                          | Result                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                          | `"Tue Mar 31 2026 23:22:07 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                      | `false` → V1 active ✓                                                             |
| Field lookup | filter snippet (enableTime=false, ignoreTimezone=true, useLegacy=true, enableInitialValue=false) | `["DataField11"]` ✓                                                               |

## Step Results

| Step # | Expected                     | Actual                       | Match    |
| ------ | ---------------------------- | ---------------------------- | -------- |
| 3      | Field displays `03/15/2026`  | Field displays `03/15/2026`  | PASS     |
| 5      | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| 6      | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| 7      | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Bug #7 active: typed `03/15/2026` stored as `"2026-03-14"` (-1 day shift). IST midnight parsed as local → `toISOString()` gives previous UTC date → `getSaveValue()` strips to `"2026-03-14"`.

## Findings

- Actual matches matrix prediction `"2026-03-14"` — prediction was correct
- **Bug #7 confirmed in legacy typed input (Config F, IST)**: same -1 day shift as non-legacy configs A/B-IST and sibling E-IST (predicted)
- `ignoreTZ=true` has no effect on date-only typed input — Config F result identical to Config E prediction, as expected
- **Bug #2 confirmed for useLegacy=true in IST**: popup (tc-1-F-IST) stores `"2026-03-14T18:30:00.000Z"` (raw toISOString), typed stores `"2026-03-14"` (getSaveValue processed) — different formats for same intended date
- GetFieldValue returns raw value unchanged — no Bug #5/6 for date-only configs
- No sibling matrix corrections needed — 2-E-IST prediction `"2026-03-14"` remains consistent with this result
- **Recommended next**: Run 2-E-IST to confirm Config E typed IST matches this Config F result
