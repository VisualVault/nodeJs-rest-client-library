# TC-6-A-IST — Run 1 | 2026-04-01 | IST | PASS

**Spec**: [tc-6-A-IST.md](../test-cases/tc-6-A-IST.md) | **Summary**: [summary](../summaries/tc-6-A-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-01                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer, Build 20260304.1     |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                   |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Wed Apr 01 2026 23:11:23 GMT+0530 (India Standard Time)"` — GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                    |
| Field lookup | `getValueObjectValue('DataField1')` non-empty               | Date object `"2026-04-01T17:41:16.150Z"` — auto-populated ✓              |

## Step Results

| Step # | Expected                         | Actual                                     | Match |
| ------ | -------------------------------- | ------------------------------------------ | ----- |
| 3      | UTC ISO string with today's date | `"2026-04-01T17:41:16.150Z"` (Date object) | PASS  |
| 4      | `"04/01/2026"` (today IST)       | `"04/01/2026"`                             | PASS  |
| 5      | Same as step 3 (raw unchanged)   | `"2026-04-01T17:41:16.150Z"` (Date object) | PASS  |

## Outcome

**PASS** — Current Date field auto-populates correctly in IST. The stored value is a UTC Date object reflecting the exact moment of form load (`"2026-04-01T17:41:16.150Z"`). Both UTC and IST dates are April 1 — no cross-midnight edge at test time (23:11 IST = 17:41 UTC, both April 1).

## Findings

- **Current Date path confirmed correct in IST**: The `new Date()` → store approach produces a genuine UTC timestamp, not a date-only string. No Bug #7 involvement — Current Date skips the `moment(e).toDate()` parsing that causes date shifts
- **Key contrast with Preset Date (5-A-IST)**: Preset stores via `moment("2026-03-01").toDate()` → Bug #7 shifts to Feb 28 UTC. Current Date stores via `new Date()` → correct UTC. Same config (A), same TZ (IST), but different init path = different result
- **Raw value is a Date object** (not a string) — same as preset fields before save. Type is `Date`, not `string`. Serializes to `"2026-04-01T17:41:16.150Z"` via toISOString()
- **Cross-midnight edge not triggered**: Test ran at 23:11 IST when UTC was still April 1. To test the edge case, run between 00:00–05:30 IST when UTC is the previous day
- Recommended next: run 6-A-IST at an IST time where UTC date differs (00:00–05:30 IST window) to verify cross-midnight behavior
