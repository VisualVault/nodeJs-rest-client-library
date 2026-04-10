# TC-1-F-IST — Run 1 | 2026-03-31 | IST | PASS

**Spec**: [tc-1-F-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-1-F-IST.md) | **Summary**: [summary](../summaries/tc-1-F-IST.md)

## Environment

| Parameter     | Value                                       |
| ------------- | ------------------------------------------- |
| Date          | 2026-03-31                                  |
| Tester TZ     | `Asia/Calcutta` — UTC+5:30 (IST)            |
| Code path     | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform      | VisualVault FormViewer, Build 20260304.1    |
| Form instance | DateTest-000054                             |

## Preconditions Verified

| Check        | Command                                                                                          | Result                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                          | `"Tue Mar 31 2026 21:00:48 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                      | `false` → V1 active ✓                                                             |
| Field lookup | filter snippet (enableTime=false, ignoreTimezone=true, useLegacy=true, enableInitialValue=false) | `["DataField11"]` ✓                                                               |

## Step Results

| Step # | Expected                                              | Actual                                               | Match |
| ------ | ----------------------------------------------------- | ---------------------------------------------------- | ----- |
| 4      | Popup closes immediately; field displays `03/15/2026` | Popup closed immediately; display value `03/15/2026` | PASS  |
| 5      | `"2026-03-14T18:30:00.000Z"`                          | `"2026-03-14T18:30:00.000Z"`                         | PASS  |
| 6      | `"2026-03-14T18:30:00.000Z"`                          | `"2026-03-14T18:30:00.000Z"`                         | PASS  |
| 7      | `"2026-03-14T18:30:00.000Z"` — confirms IST active    | `"2026-03-14T18:30:00.000Z"`                         | PASS  |

## Outcome

**PASS** — All steps match expected values. Legacy popup for Config F stores `"2026-03-14T18:30:00.000Z"` (IST midnight as UTC datetime), identical to Config E. `ignoreTZ=true` has no observable effect on the legacy popup path.

## Findings

- **Matrix prediction confirmed**: The corrected prediction `"2026-03-14T18:30:00.000Z"` (updated 2026-03-31 based on 1-E-IST live test) was correct. No further matrix corrections needed for this row.
- **ignoreTZ is a no-op on legacy popup**: Config E (`ignoreTZ=false`) and Config F (`ignoreTZ=true`) produce identical stored values on the legacy popup path. The `ignoreTZ` flag does not alter the popup's UTC datetime storage behavior.
- **Bug #7 absent**: The legacy popup path does not run through `normalizeCalValue()` and is not affected by Bug #7. The stored value is the correct UTC representation of IST midnight.
- **Bug #5 absent**: `enableTime=false` means `getCalendarFieldValue()` does not enter the fake-Z branch. GetFieldValue returns the raw value unchanged.
- **Bug #4 not triggered**: Z suffix is present in the stored value. Legacy save path did not strip it on this run.
- **No sibling corrections needed**: 1-E-IST already confirmed the format. This run adds the ignoreTZ=true data point showing no divergence.
- **Recommended next action**: Run 2-F-IST (typed input, Config F, IST) to verify whether typed input also stores the same UTC datetime format under the legacy path, or stores a date-only string (Bug #2 manifestation).
