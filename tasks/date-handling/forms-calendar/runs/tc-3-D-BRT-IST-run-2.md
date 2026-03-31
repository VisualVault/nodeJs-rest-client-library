# TC-3-D-BRT-IST — Run 2 | 2026-04-01 | IST | FAIL-3

**Spec**: [tc-3-D-BRT-IST.md](../test-cases/tc-3-D-BRT-IST.md) | **Summary**: [summary](../summaries/tc-3-D-BRT-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-04-01                                  |
| Tester TZ | `Asia/Calcutta` — UTC+5:30 (IST)            |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                                                   | Result                                                                            |
| ------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                   | `"Wed Apr 01 2026 04:07:40 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                               | `false` → V1 active ✓                                                             |
| Field lookup | filter by enableTime=true, ignoreTimezone=true, useLegacy=false, enableInitialValue=false | `["DataField5"]` ✓                                                                |

## Step Results

| Step # | Expected                     | Actual                       | Match    |
| ------ | ---------------------------- | ---------------------------- | -------- |
| 1      | All P1–P6 checks pass        | All P1–P6 checks pass        | PASS     |
| 2      | `DateTest-000004 Rev 1`      | `DateTest-000004 Rev 1`      | PASS     |
| 3      | `03/15/2026 12:00 AM`        | `03/15/2026 12:00 AM`        | PASS     |
| 4      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS     |
| 5      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| 6      | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-3** — Bug #5 confirmed on IST reload: `GetFieldValue('DataField5')` returns `"2026-03-15T00:00:00.000Z"` (fake Z appended) instead of the raw stored `"2026-03-15T00:00:00"`. Raw value and display are correct — the reload path preserves the stored value without shift. Only the GFV output is buggy.

## Findings

- Raw stored value `"2026-03-15T00:00:00"` is TZ-invariant on cross-TZ reload: identical in IST as in BRT. Config D's `ignoreTimezone=true` suppresses offset conversion in both save and load paths. PASS for reload stability.
- Display `03/15/2026 12:00 AM` is correct in IST — same as BRT. PASS for display.
- **GFV returns fake Z**: `"2026-03-15T00:00:00.000Z"` — Bug #5 active. This contradicts Run 1 (2026-03-27) which reported GFV = `"2026-03-15T00:00:00"` (clean, no fake Z). The discrepancy may indicate: (a) Run 1 observation was in error, (b) some internal state caching affected Run 1, or (c) the form was in a different load state during Run 1. Run 2 result is more consistent with code analysis — `getCalendarFieldValue()` always applies the `moment(value).toISOString()` transformation for Config D.
- Config C (DataField6) GFV on same reload returned `"2026-03-14T18:30:00.000Z"` — real UTC conversion (IST midnight = previous day 18:30 UTC). Config D GFV returned `"2026-03-15T00:00:00.000Z"` — fake Z (hours unchanged). This contrast confirms Bug #5 is Config D-specific.
- Corrects Run 1 outcome from PASS to FAIL-3. Matrix status should update accordingly.
- A `SetFieldValue(GetFieldValue())` round-trip in IST would cause +5:30h drift per trip (see 9-D-IST-1).
