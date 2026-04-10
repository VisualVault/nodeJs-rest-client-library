# TC-11-C-save-BRT-load-IST — Run 1 | 2026-04-08 | IST | PASS

**Spec**: [tc-11-C-save-BRT-load-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-11-C-save-BRT-load-IST.md) | **Summary**: [summary](../summaries/tc-11-C-save-BRT-load-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-08                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                            | Result                |
| ------------ | ---------------------------------- | --------------------- |
| TZ           | `new Date().toString()`            | Contains GMT+0530 ✓   |
| V1/V2        | useUpdatedCalendarValueLogic       | `false` → V1 active ✓ |
| Field lookup | Config C filter                    | `["Field6"]` ✓        |
| Record       | DateTest-000106 Rev 1 (cat3-C-BRT) | Loaded successfully ✓ |

## Step Results

| Step # | Expected                               | Actual                                 | Match       |
| ------ | -------------------------------------- | -------------------------------------- | ----------- |
| 3      | `"2026-03-15T00:00:00"`                | `"2026-03-15T00:00:00"`                | PASS        |
| 4      | `"2026-03-15T03:00:00.000Z"` (BRT UTC) | `"2026-03-14T18:30:00.000Z"` (IST UTC) | observation |

## Outcome

**PASS** — Config C DateTime raw value `"2026-03-15T00:00:00"` survives cross-TZ load from BRT to IST. Raw storage is preserved. GFV re-interprets the timezone-ambiguous stored value in the loading TZ (IST midnight → `"2026-03-14T18:30:00.000Z"` vs BRT midnight → `"2026-03-15T03:00:00.000Z"`). This is a structural design limitation of storing local time without timezone info, not a load-time bug.

## Findings

- Raw value preserved across timezone change — no load-time corruption
- GFV returns IST-reinterpreted UTC for the stored local time: `"2026-03-14T18:30:00.000Z"` (Mar 15 00:00 IST = Mar 14 18:30 UTC)
- The "correct" UTC depends on which timezone's midnight is intended — BRT origin would be `"2026-03-15T03:00:00.000Z"`
- This is the inherent limitation of Config C (enableTime=true, ignoreTimezone=false): the stored `T00:00:00` is timezone-ambiguous
- No new bug introduced by cross-TZ load; the ambiguity exists at storage time
