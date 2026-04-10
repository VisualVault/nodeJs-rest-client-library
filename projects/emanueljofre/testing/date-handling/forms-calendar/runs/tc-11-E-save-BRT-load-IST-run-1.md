# TC-11-E-save-BRT-load-IST — Run 1 | 2026-04-08 | IST | PASS

**Spec**: [tc-11-E-save-BRT-load-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-11-E-save-BRT-load-IST.md) | **Summary**: [summary](../summaries/tc-11-E-save-BRT-load-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-08                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                             | Result                |
| ------------ | ----------------------------------- | --------------------- |
| TZ           | `new Date().toString()`             | Contains GMT+0530 ✓   |
| V1/V2        | useUpdatedCalendarValueLogic        | `false` → V1 active ✓ |
| Field lookup | Config E filter                     | `["Field12"]` ✓       |
| Record       | DateTest-000471 Rev 1 (cat3-EF-BRT) | Loaded successfully ✓ |

## Step Results

| Step # | Expected       | Actual         | Match |
| ------ | -------------- | -------------- | ----- |
| 3      | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| 4      | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — Legacy date-only (Config E) also survives cross-TZ load from BRT to IST. Matrix prediction of FORM-BUG-7 on load was wrong.

## Findings

- Same result as 11-A and 11-B: raw string values survive server round-trips between timezones
- Legacy date-only fields (useLegacy=true) are equally immune to load-time corruption
- FORM-BUG-7 fires at INPUT time only, not at form load time — consistent across all date-only configs tested (A, B, E)
