# TC-11-F-save-BRT-load-IST — Run 1 | 2026-04-09 | IST | PASS

**Spec**: [tc-11-F-save-BRT-load-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-11-F-save-BRT-load-IST.md) | **Summary**: [summary](../summaries/tc-11-F-save-BRT-load-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-09                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                             | Result                |
| ------------ | ----------------------------------- | --------------------- |
| TZ           | `new Date().toString()`             | Contains GMT+0530 ✓   |
| V1/V2        | useUpdatedCalendarValueLogic        | `false` → V1 active ✓ |
| Field lookup | Config F filter                     | `["Field11"]` ✓       |
| Record       | DateTest-001903 Rev 1 (cat3-EF-BRT) | Loaded successfully ✓ |

## Step Results

| Step # | Expected       | Actual         | Match |
| ------ | -------------- | -------------- | ----- |
| 3      | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| 4      | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — Config F (legacy date-only + ignoreTZ) raw value `"2026-03-15"` survives cross-TZ load from BRT to IST. Both raw and GFV return the same preserved value. Legacy date-only configs are immune to all known load-time bugs, regardless of `ignoreTimezone` setting.

## Findings

- Raw value preserved across BRT→IST — matches Config E (11-E-save-BRT-load-IST PASS)
- `ignoreTimezone=true` has no effect on date-only legacy load behavior — expected, as the flag is only relevant for DateTime GFV paths
- Completes the legacy date-only pair: E (ignoreTZ=false) and F (ignoreTZ=true) both PASS for cross-TZ load
