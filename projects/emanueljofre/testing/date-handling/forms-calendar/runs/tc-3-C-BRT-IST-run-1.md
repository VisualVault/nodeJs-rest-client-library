# TC-3-C-BRT-IST — Run 1 | 2026-04-01 | IST | FAIL-3, FAIL-4

**Spec**: [tc-3-C-BRT-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-3-C-BRT-IST.md) | **Summary**: [summary](../summaries/tc-3-C-BRT-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-01                                   |
| Tester TZ   | `Asia/Calcutta` — UTC+5:30 (IST)             |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer, Build 20260304.1     |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                                                    | Result                                                                            |
| ------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                    | `"Wed Apr 01 2026 19:52:09 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                | `false` → V1 active ✓                                                             |
| Field lookup | filter by enableTime=true, ignoreTimezone=false, useLegacy=false, enableInitialValue=false | `["DataField6"]` ✓                                                                |

## Step Results

| Step # | Expected                     | Actual                       | Match    |
| ------ | ---------------------------- | ---------------------------- | -------- |
| 1      | All P1–P6 checks pass        | All P1–P6 checks pass        | PASS     |
| 2      | `DateTest-000106 Rev 1`      | `DateTest-000106 Rev 1`      | PASS     |
| 3      | `03/15/2026 8:30 AM`         | `03/15/2026 12:00 AM`        | **FAIL** |
| 4      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS     |
| 5      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | **FAIL** |
| 6      | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-3, FAIL-4** — Bug #1 + Bug #4 confirmed: BRT-saved DateTime reinterpreted as IST local midnight on cross-TZ reload. GFV shifts from `T03:00:00Z` (correct BRT midnight in UTC) to `T18:30:00Z` (IST midnight in UTC) — 8.5-hour shift matching the BRT→IST offset.

## Findings

- **Bug #1 + Bug #4 interaction confirmed for Config C cross-TZ**: The stored value `"2026-03-15T00:00:00"` (BRT midnight, Z stripped by Bug #4 on save) is reinterpreted as IST midnight on reload (Bug #1: `parseDateString()` + `new Date()` parse as local). Display shows `12:00 AM` (IST midnight) instead of `8:30 AM` (BRT midnight in IST). GFV returns `"2026-03-14T18:30:00.000Z"` instead of `"2026-03-15T03:00:00.000Z"`.
- **Raw value PASS is misleading**: Step 4 passes because the raw string `"2026-03-15T00:00:00"` is unchanged from the server, but its semantic meaning has silently shifted from BRT midnight to IST midnight. The string identity masks a timezone reinterpretation.
- **Contrast with tc-3-C-BRT-BRT (PASS)**: Same-TZ reload preserves correct semantics because the ambiguous string happens to be reinterpreted in the same timezone it was saved in. The cross-TZ test exposes the underlying fragility.
- **Contrast with tc-3-A-BRT-IST (PASS)**: Config A (date-only) survived cross-TZ reload because the V1 load path for date-only strings (`"2026-03-15"`, no `T`) uses a different code branch that preserves the raw value without re-parsing through `new Date()`. Config C (DateTime) takes a different branch that creates a `new Date()` from the string.
- **Matrix prediction was wrong**: The matrix predicted "Config C stores real UTC; IST reload shows correct local time (control)". In reality, Config C does NOT store real UTC — it stores local time without timezone info (Bug #4). The prediction should be corrected.
- **Recommended next action**: Run 3-C-IST-BRT (reverse direction) to verify the bug is bidirectional. Also consider testing 3-C-BRT-UTC0 to confirm the shift magnitude scales with the TZ offset.
