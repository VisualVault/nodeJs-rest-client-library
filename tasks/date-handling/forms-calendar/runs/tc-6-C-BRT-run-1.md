# TC-6-C-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-6-C-BRT.md](../test-cases/tc-6-C-BRT.md) | **Summary**: [summary](../summaries/tc-6-C-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                      |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Fri Apr 03 2026 17:10:08 GMT-0300 (Brasilia Standard Time)"` — GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                       |
| Field lookup | `getValueObjectValue('DataField17')` non-empty              | Date object `"2026-04-03T20:10:00.466Z"` — auto-populated ✓                 |

## Step Results

| Step # | Expected                     | Actual                                     | Match |
| ------ | ---------------------------- | ------------------------------------------ | ----- |
| 2      | Display today with time      | `04/03/2026` (rawLocal)                    | PASS  |
| 3      | UTC ISO string — Date object | `"2026-04-03T20:10:00.466Z"` (Date object) | PASS  |
| 4      | GFV = raw ISO (real UTC)     | `"2026-04-03T20:10:00.466Z"` (string)      | PASS  |

## Outcome

**PASS** — Config C DateTime Current Date correct in BRT. Raw is a UTC Date object, and GFV uses `new Date(value).toISOString()` to return the same real UTC ISO string. No transformation bugs.

## Findings

- **DateTime Current Date stores real UTC timestamp**: `new Date()` produces a genuine UTC timestamp at form load time. No timezone-sensitive parsing involved
- **Config C GFV returns correct value**: `getCalendarFieldValue()` with `ignoreTimezone=false` uses `new Date(value).toISOString()` — produces the real UTC ISO, not a fake Z
- **No transformation bugs**: The init-to-GFV round trip is clean for Config C Current Date
- **Compare with Config D (Bug #5 FAIL)**: Config D (`ignoreTimezone=true`) uses `moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")` which produces fake Z. Same raw value, different GFV output — the difference is purely in the GFV layer
