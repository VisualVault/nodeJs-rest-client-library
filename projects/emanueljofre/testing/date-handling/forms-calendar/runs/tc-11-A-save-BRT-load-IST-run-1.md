# TC-11-A-save-BRT-load-IST — Run 1 | 2026-04-08 | IST | PASS

**Spec**: [tc-11-A-save-BRT-load-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-11-A-save-BRT-load-IST.md) | **Summary**: [summary](../summaries/tc-11-A-save-BRT-load-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-08                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                      | Result                |
| ------------ | ---------------------------- | --------------------- |
| TZ           | `new Date().toString()`      | Contains GMT+0530 ✓   |
| V1/V2        | useUpdatedCalendarValueLogic | `false` → V1 active ✓ |
| Field lookup | Config A filter              | `["Field7"]` ✓        |
| Record       | DateTest-000080 Rev 2        | Loaded successfully ✓ |

## Step Results

| Step # | Expected       | Actual         | Match |
| ------ | -------------- | -------------- | ----- |
| 3      | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| 4      | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — Config A date-only raw value `"2026-03-15"` survives cross-TZ load from BRT to IST. No FORM-BUG-7 on load — the server returns the stored string directly, and the form preserves it.

## Findings

- Matrix prediction of FORM-BUG-7 on load was WRONG — corrected
- Raw string values survive server round-trips between timezones
- FORM-BUG-7 fires at INPUT time (SFV, typed input), NOT at form load time
- Consistent with Cat 3 result 3-A-BRT-IST (also PASS)
- Key insight: initCalendarValueV1 preserves the stored string value; it does NOT re-parse date-only strings through moment().toDate() on load
