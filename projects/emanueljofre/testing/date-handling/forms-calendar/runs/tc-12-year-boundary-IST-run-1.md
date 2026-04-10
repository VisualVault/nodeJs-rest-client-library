# TC-12-year-boundary-IST — Run 1 | 2026-04-02 | IST | FAIL-2

**Spec**: [tc-12-year-boundary-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-12-year-boundary-IST.md) | **Summary**: [summary](../summaries/tc-12-year-boundary-IST.md)

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
| 3      | `"2026-01-01T00:00:00"` (baseline)      | `"2026-01-01T00:00:00"`      | PASS     |
| 4      | `"2026-01-01T00:00:00"` (baseline GFV)  | `"2026-01-01T00:00:00.000Z"` | **FAIL** |
| 7      | `"2026-01-01T00:00:00"` (post-trip)     | `"2026-01-01T05:30:00"`      | **FAIL** |
| 8      | `"2026-01-01T00:00:00"` (post-trip GFV) | `"2026-01-01T05:30:00.000Z"` | **FAIL** |
| 9      | `"2025-12-31T18:30:00.000Z"` (TZ ref)   | `"2025-12-31T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-2** — Bug #5 +5:30h drift confirmed at year boundary. Stays in 2026: `"2026-01-01T00:00:00"` → `"2026-01-01T05:30:00"` (+5:30h, remains Jan 1 2026).

## Findings

- Actual matches matrix prediction: "1 trip: +5:30h → 2026-01-01T05:30:00 — stays in 2026 (opposite of BRT)"
- **Key contrast with BRT**: BRT crosses year boundary backward (`"2026-01-01T00:00:00"` → `"2025-12-31T21:00:00"` — fiscal year corrupted). IST stays in 2026 (+5:30h forward). IST is LESS destructive at year boundaries
- In IST, it takes ~4.4 trips to accumulate a full day of drift (vs 8 trips in BRT). But the direction is forward (into the future), not backward (into the past), so year/month boundaries are less likely to be crossed at midnight
- Bug #5 baseline fake Z confirmed (step 4)
- No further action — Bug #5 year boundary IST behavior characterized
