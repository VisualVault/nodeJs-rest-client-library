# TC-12-near-midnight-2-IST — Run 1 | 2026-04-02 | IST | FAIL-2

**Spec**: [tc-12-near-midnight-2-IST.md](../test-cases/tc-12-near-midnight-2-IST.md) | **Summary**: [summary](../summaries/tc-12-near-midnight-2-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-02                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer, Build 20260304.1     |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                            |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Thu Apr 02 2026 19:29:07 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | filter Config D flags                                       | `["DataField5"]` ✓                                                                |

## Step Results

| Step # | Expected                                | Actual                       | Match    |
| ------ | --------------------------------------- | ---------------------------- | -------- |
| 3      | `"2026-03-15T23:00:00"` (baseline)      | `"2026-03-15T23:00:00"`      | PASS     |
| 4      | `"2026-03-15T23:00:00"` (baseline GFV)  | `"2026-03-15T23:00:00.000Z"` | **FAIL** |
| 7      | `"2026-03-15T23:00:00"` (post-trip)     | `"2026-03-16T04:30:00"`      | **FAIL** |
| 8      | `"2026-03-15T23:00:00"` (post-trip GFV) | `"2026-03-16T04:30:00.000Z"` | **FAIL** |
| 9      | `"2026-03-14T18:30:00.000Z"` (TZ ref)   | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-2** — Bug #5 +5:30h drift confirmed. Day crosses FORWARD after 1 trip: `"2026-03-15T23:00:00"` → `"2026-03-16T04:30:00"` (+5:30h, advances to Mar 16).

## Findings

- Actual matches matrix prediction: "1 trip: +5:30h → 2026-03-16T04:30:00 — day crosses FORWARD"
- **Key contrast with BRT**: BRT drifts -3h (23:00→20:00, stays same day after 1 trip, crosses after 8 trips). IST drifts +5:30h (23:00→04:30 next day, crosses after just 1 trip). IST is MORE destructive for near-midnight values
- Drift sequence in IST from 23:00: 23:00 → 04:30(+1d) → 10:00(+1d) → 15:30(+1d) → 21:00(+1d) → 02:30(+2d)... accumulates ~1 day per 4.4 trips
- Bug #5 baseline fake Z also confirmed (step 4)
- No further action — Bug #5 near-midnight IST behavior characterized
