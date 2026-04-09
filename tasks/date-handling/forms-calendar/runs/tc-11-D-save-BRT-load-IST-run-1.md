# TC-11-D-save-BRT-load-IST — Run 1 | 2026-04-09 | IST | FAIL-1

**Spec**: [tc-11-D-save-BRT-load-IST.md](../test-cases/tc-11-D-save-BRT-load-IST.md) | **Summary**: [summary](../summaries/tc-11-D-save-BRT-load-IST.md)

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
| Field lookup | Config D filter                    | `["Field5"]` ✓        |
| Record       | DateTest-001899 Rev 1 (cat3-A-BRT) | Loaded successfully ✓ |

## Step Results

| Step # | Expected                     | Actual                       | Match      |
| ------ | ---------------------------- | ---------------------------- | ---------- |
| 3      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS       |
| 4      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00.000Z"` | **FAIL-1** |
| 5      | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS       |

## Outcome

**FAIL-1** — FORM-BUG-5 confirmed on cross-TZ load. Raw value `"2026-03-15T00:00:00"` is preserved (Step 3 PASS), but `GetFieldValue` returns `"2026-03-15T00:00:00.000Z"` — the fake `.000Z` suffix makes the local BRT midnight appear as UTC midnight. On read-only load this is deceptive; on round-trip through `SetFieldValue(GetFieldValue())` in IST it would cause +5:30h drift per trip.

## Findings

- Raw value preserved across BRT→IST timezone change — no load-time corruption for Config D
- FORM-BUG-5 fake Z confirmed on cross-TZ load: `getCalendarFieldValue` appends `.000Z` regardless of loading timezone
- This is the non-legacy counterpart to Config H which bypasses FORM-BUG-5 via `useLegacy=true`
- Config D is the only config among A-H where cross-TZ load produces a deceptive GFV — all others return raw or correct values
- No new bug introduced by cross-TZ load; FORM-BUG-5 is inherent to the GFV output path for `enableTime=true && ignoreTimezone=true && !useLegacy`
