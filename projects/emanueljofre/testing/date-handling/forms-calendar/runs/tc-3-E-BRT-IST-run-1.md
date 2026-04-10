# TC-3-E-BRT-IST — Run 1 | 2026-04-02 | IST | PASS

**Spec**: [tc-3-E-BRT-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-3-E-BRT-IST.md) | **Summary**: [summary](../summaries/tc-3-E-BRT-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-02                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer, Build 20260304.1     |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                                                             | Result                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                             | `"Thu Apr 02 2026 19:20:15 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                         | `false` → V1 active ✓                                                             |
| Field lookup | filter `fieldType===13, enableTime=false, ignoreTZ=false, useLegacy=true, enableInitialValue=false` | `["DataField12"]` ✓                                                               |

## Step Results

| Step # | Expected                              | Actual                       | Match |
| ------ | ------------------------------------- | ---------------------------- | ----- |
| 2      | `DateTest-000471 Rev 1`               | `DateTest-000471 Rev 1`      | PASS  |
| 4      | `"2026-03-15"` (raw after reload)     | `"2026-03-15"`               | PASS  |
| 5      | `"2026-03-15"` (GFV after reload)     | `"2026-03-15"`               | PASS  |
| 6      | `"2026-03-14T18:30:00.000Z"` (TZ ref) | `"2026-03-14T18:30:00.000Z"` | PASS  |

## Outcome

**PASS** — Config E legacy date-only value survives cross-TZ (BRT→IST) reload intact. Raw stored value `"2026-03-15"` is unchanged after loading in IST (UTC+5:30). GFV returns raw value unchanged.

## Findings

- Actual matches matrix prediction: "No shift — same as A-BRT-IST; date-only survives cross-TZ reload"
- **Cross-TZ reload is safe for legacy date-only fields** in IST. The date-only string `"2026-03-15"` passes through `initCalendarValueV1` unchanged regardless of reader timezone
- Consistent with non-legacy equivalents: 3-A-BRT-IST (PASS), 3-B-BRT-IST (PASS) — `useLegacy=true` does not alter date-only cross-TZ behavior
- Bug #7 does NOT fire on the form load path for date-only fields — the raw string is preserved, not re-parsed through `moment(e).toDate()`
- Record: DateTest-000471 Rev 1 (cat3-EF-BRT), verified DataField12 in IST context
- No further action needed for this config — cross-TZ behavior validated
