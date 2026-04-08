# TC-11-B-save-BRT-load-IST — Run 1 | 2026-04-08 | IST | PASS

**Spec**: [tc-11-B-save-BRT-load-IST.md](../test-cases/tc-11-B-save-BRT-load-IST.md) | **Summary**: [summary](../summaries/tc-11-B-save-BRT-load-IST.md)

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
| Field lookup | Config B filter                    | `["Field10"]` ✓       |
| Record       | DateTest-000107 Rev 1 (cat3-B-BRT) | Loaded successfully ✓ |

## Step Results

| Step # | Expected       | Actual         | Match |
| ------ | -------------- | -------------- | ----- |
| 3      | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| 4      | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — Config B (date-only + ignoreTimezone) also survives cross-TZ load from BRT to IST. ignoreTimezone has no effect on the date-only load path.

## Findings

- Matrix prediction of FORM-BUG-7 on load was WRONG — corrected
- Same result as 11-A: raw string values survive server round-trips between timezones
- ignoreTZ is irrelevant for date-only fields on load — initCalendarValueV1 preserves the stored string without re-parsing
- FORM-BUG-7 fires at INPUT time only, not at form load time
