# TC-6-C-IST — Run 1 | 2026-04-03 | IST | PASS

**Spec**: [tc-6-C-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-6-C-IST.md) | **Summary**: [summary](../summaries/tc-6-C-IST.md)

## Environment

| Parameter   | Value                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| Date        | 2026-04-03                                                                  |
| Browser     | Firefox (Playwright headless)                                               |
| Tester TZ   | Asia/Kolkata — UTC+5:30 (IST)                                               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                 |
| Platform    | VisualVault FormViewer, Build 20260304.1                                    |
| Test Method | Playwright regression (`timezoneId: Asia/Kolkata`, `--project IST-firefox`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                   |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Sat Apr 04 2026 01:50:56 GMT+0530 (India Standard Time)"` — GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                    |
| Field lookup | `getValueObjectValue('DataField17')` non-empty              | Date object `"2026-04-03T20:20:54.087Z"` — auto-populated ✓              |

## Step Results

| Step # | Expected                     | Actual                                     | Match |
| ------ | ---------------------------- | ------------------------------------------ | ----- |
| 2      | Display today with time      | `04/04/2026` (rawLocal)                    | PASS  |
| 3      | UTC ISO string — Date object | `"2026-04-03T20:20:54.087Z"` (Date object) | PASS  |
| 4      | GFV = raw ISO (real UTC)     | `"2026-04-03T20:20:54.087Z"` (string)      | PASS  |

## Outcome

**PASS** — Config C DateTime Current Date correct in IST. Raw is a UTC Date object, and GFV uses `new Date(value).toISOString()` to return the same real UTC ISO string. No transformation bugs. Cross-midnight edge active.

## Findings

- **DateTime Current Date stores real UTC timestamp**: `new Date()` produces a genuine UTC timestamp at form load time. No timezone-sensitive parsing involved
- **Config C GFV returns correct value**: `getCalendarFieldValue()` with `ignoreTimezone=false` uses `new Date(value).toISOString()` — produces the real UTC ISO, not a fake Z
- **Cross-midnight confirmed**: IST 01:50 = UTC 20:20 previous day. Raw UTC date is April 3, IST display is April 4 — both correct
- **Compare with Config D (Bug #5 FAIL)**: 6-D-IST uses `moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")` which produces fake Z (+5:30h shift). Same raw value, different GFV output
