# TC-12-leap-day-IST — Run 1 | 2026-04-02 | IST | FAIL-2

**Spec**: [tc-12-leap-day-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-12-leap-day-IST.md) | **Summary**: [summary](../summaries/tc-12-leap-day-IST.md)

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
| 3      | `"2028-02-29T00:00:00"` (baseline)      | `"2028-02-29T00:00:00"`      | PASS     |
| 4      | `"2028-02-29T00:00:00"` (baseline GFV)  | `"2028-02-29T00:00:00.000Z"` | **FAIL** |
| 7      | `"2028-02-29T00:00:00"` (post-trip)     | `"2028-02-29T05:30:00"`      | **FAIL** |
| 8      | `"2028-02-29T00:00:00"` (post-trip GFV) | `"2028-02-29T05:30:00.000Z"` | **FAIL** |
| 9      | `"2028-02-28T18:30:00.000Z"` (TZ ref)   | `"2028-02-28T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-2** — Bug #5 +5:30h drift confirmed on leap day. Leap day PRESERVED: `"2028-02-29T00:00:00"` → `"2028-02-29T05:30:00"` (+5:30h, still Feb 29).

## Findings

- Actual matches matrix prediction: "1 trip: +5:30h → 2028-02-29T05:30:00 — leap day NOT lost (opposite of BRT)"
- **Key contrast with BRT**: BRT loses leap day (`"2028-02-29T00:00:00"` → `"2028-02-28T21:00:00"` — Feb 29 becomes Feb 28). IST preserves it (+5:30h stays on Feb 29). Same bug, opposite data integrity impact
- After ~4 trips in IST: 00:00 → 05:30 → 11:00 → 16:30 → 22:00 → 03:30(Mar 1) — eventually crosses to Mar 1, but takes 5 trips vs BRT's 1 trip to lose the date
- Bug #5 baseline fake Z confirmed (step 4)
- No further action — Bug #5 leap day IST behavior characterized
