# TC-11-H-save-BRT-load-IST — Run 1 | 2026-04-09 | IST | PASS

**Spec**: [tc-11-H-save-BRT-load-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-11-H-save-BRT-load-IST.md) | **Summary**: [summary](../summaries/tc-11-H-save-BRT-load-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-09                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                            | Result                |
| ------------ | ---------------------------------- | --------------------- |
| TZ           | `new Date().toString()`            | Contains GMT+0530 ✓   |
| V1/V2        | useUpdatedCalendarValueLogic       | `false` → V1 active ✓ |
| Field lookup | Config H filter                    | `["Field13"]` ✓       |
| Record       | DateTest-001904 Rev 1 (cat3-H-BRT) | Loaded successfully ✓ |

## Step Results

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| 3      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| 4      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — Config H (legacy DateTime + ignoreTZ) raw value `"2026-03-15T00:00:00"` survives cross-TZ load from BRT to IST. GFV returns raw — `useLegacy=true` bypasses FORM-BUG-5 fake Z. This is the direct counterpart to Config D which exhibits FORM-BUG-5 on the same cross-TZ load.

## Findings

- Raw value preserved across BRT→IST — consistent with 11-H-BRT-roundtrip (0 drift after 3 trips)
- `useLegacy=true` bypasses FORM-BUG-5: Config D (same flags minus useLegacy) returns `"...000Z"`, Config H returns raw
- Cross-TZ load does not alter the `useLegacy` bypass — FORM-BUG-5 immunity holds regardless of loading timezone
- All 4 legacy configs (E, F, G, H) now confirmed PASS for BRT→IST cross-TZ load
