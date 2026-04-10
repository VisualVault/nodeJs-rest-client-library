# TC-3-A-BRT-IST — Run 1 | 2026-04-01 | IST | PASS

**Spec**: [tc-3-A-BRT-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-3-A-BRT-IST.md) | **Summary**: [summary](../summaries/tc-3-A-BRT-IST.md)

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
| TZ           | `new Date().toString()`                                                                     | `"Wed Apr 01 2026 04:14:32 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                 | `false` → V1 active ✓                                                             |
| Field lookup | filter by enableTime=false, ignoreTimezone=false, useLegacy=false, enableInitialValue=false | `["DataField7"]` ✓                                                                |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| 1      | All P1–P6 checks pass        | All P1–P6 checks pass        | PASS  |
| 2      | `DateTest-000004 Rev 1`      | `DateTest-000004 Rev 1`      | PASS  |
| 3      | `03/15/2026`                 | `03/15/2026`                 | PASS  |
| 4      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 5      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 6      | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS  |

## Outcome

**PASS** — Config A date-only string `"2026-03-15"` survives BRT→IST cross-TZ reload without shift. Display, raw value, and GFV all correct.

## Findings

- **Matrix prediction was wrong**: The matrix predicted Bug #7 would fire on IST reload, shifting `"2026-03-15"` → `"2026-03-14"`. Live observation shows no shift. The date-only string passes through the V1 form load path unchanged.
- Bug #7 is confirmed for `SetFieldValue` and `normalizeCalValue` paths (see 1-A-IST, 2-A-IST, 7-A-IST tests), but the form load path (`initCalendarValueV1`) apparently handles date-only strings differently — either it preserves the raw string without re-parsing through a Date object, or `getSaveValue` for `enableTime=false` extracts the local date rather than the UTC date.
- GFV returns `"2026-03-15"` — no transformation for Config A (expected; Bug #5 only affects Config D).
- Display shows `03/15/2026` — correct, no shift.
- **Knock-on corrections needed**: Matrix rows `3-B-BRT-IST` and `3-E-BRT-IST` predicted the same Bug #7 shift for date-only fields on IST reload. These predictions should be corrected to "No shift — date-only string survives cross-TZ reload" based on this finding.
- The load path difference explains why Bug #7 has different scope than originally analyzed: it affects user-input paths (`SetFieldValue`, `normalizeCalValue`) but NOT the server reload path for date-only strings.
