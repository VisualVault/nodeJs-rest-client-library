# TC-11-G-save-BRT-load-IST — Run 1 | 2026-04-09 | IST | PASS

**Spec**: [tc-11-G-save-BRT-load-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-11-G-save-BRT-load-IST.md) | **Summary**: [summary](../summaries/tc-11-G-save-BRT-load-IST.md)

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
| Field lookup | Config G filter                    | `["Field14"]` ✓       |
| Record       | DateTest-001902 Rev 1 (cat3-G-BRT) | Loaded successfully ✓ |

## Step Results

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| 3      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| 4      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — Config G (legacy DateTime, ignoreTimezone=false) raw value `"2026-03-15T00:00:00"` survives cross-TZ load from BRT to IST. GFV returns raw value directly — `useLegacy=true` short-circuits before checking `ignoreTimezone`, so the `ignoreTimezone=false` flag has no effect on the GFV return path.

## Findings

- Raw value preserved across BRT→IST — matches Config H roundtrip behavior (0 drift)
- `useLegacy=true` returns raw from GFV regardless of `ignoreTimezone` setting — both G (false) and H (true) return raw
- Config G is structurally identical to Config C for storage but differs in GFV: C does `new Date(value).toISOString()` (re-interprets TZ), G returns raw directly (legacy bypass)
- Completes the legacy DateTime coverage for cross-TZ load: G (ignoreTZ=false) and H (ignoreTZ=true) both PASS
