# TC-3-H-BRT-IST — Run 1 | 2026-04-02 | IST | PASS

**Spec**: [tc-3-H-BRT-IST.md](../test-cases/tc-3-H-BRT-IST.md) | **Summary**: [summary](../summaries/tc-3-H-BRT-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-02                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer, Build 20260304.1     |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                                                           | Result                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                           | `"Thu Apr 02 2026 19:20:15 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                       | `false` → V1 active ✓                                                             |
| Field lookup | filter `fieldType===13, enableTime=true, ignoreTZ=true, useLegacy=true, enableInitialValue=false` | `["DataField13"]` ✓                                                               |

## Step Results

| Step # | Expected                                   | Actual                       | Match |
| ------ | ------------------------------------------ | ---------------------------- | ----- |
| 2      | `DateTest-000472 Rev 1`                    | `DateTest-000472 Rev 1`      | PASS  |
| 4      | `"2026-03-15T00:00:00"` (raw after reload) | `"2026-03-15T00:00:00"`      | PASS  |
| 5      | `"2026-03-15T00:00:00"` (GFV after reload) | `"2026-03-15T00:00:00"`      | PASS  |
| 6      | `true` (GFV === raw)                       | `true`                       | PASS  |
| 7      | `"2026-03-14T18:30:00.000Z"` (TZ ref)      | `"2026-03-14T18:30:00.000Z"` | PASS  |

## Outcome

**PASS** — Config H legacy DateTime + ignoreTZ value survives cross-TZ (BRT→IST) reload intact. Raw stored value `"2026-03-15T00:00:00"` is unchanged after loading in IST. GFV returns raw value without fake Z — `useLegacy=true` bypasses Bug #5 even in cross-TZ context.

## Findings

- Actual matches matrix prediction: "Display OK; no fake Z drift (useLegacy=true); compare with 3-D-BRT-IST"
- **Key comparison with Config D (3-D-BRT-IST)**: Config D raw value also survives (`"2026-03-15T00:00:00"`), but GFV appends fake Z (`"2026-03-15T00:00:00.000Z"` — Bug #5). Config H's `useLegacy=true` prevents this. The legacy GFV bypass works identically in same-TZ (3-H-BRT-BRT) and cross-TZ (this test)
- `useLegacy=true` confirmed as reliable Bug #5 mitigation across all tested contexts: BRT same-TZ (TC-8-H-BRT, TC-3-H-BRT-BRT), IST cross-TZ (this test)
- The `ignoreTimezone=true` flag correctly suppresses timezone reinterpretation on cross-TZ reload — stored `"2026-03-15T00:00:00"` is treated as local midnight in IST, same as in BRT
- Record: DateTest-000472 Rev 1 (cat3-H-BRT), verified DataField13 in IST context
- No further action needed for this config — cross-TZ behavior validated
