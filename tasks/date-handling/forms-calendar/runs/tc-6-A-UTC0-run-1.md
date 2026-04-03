# TC-6-A-UTC0 — Run 1 | 2026-04-03 | UTC0 | PASS

**Spec**: [tc-6-A-UTC0.md](../test-cases/tc-6-A-UTC0.md) | **Summary**: [summary](../summaries/tc-6-A-UTC0.md)

## Environment

| Parameter   | Value                                       |
| ----------- | ------------------------------------------- |
| Date        | 2026-04-03                                  |
| Tester TZ   | Etc/GMT — UTC+0                             |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform    | VisualVault FormViewer, Build 20260304.1    |
| Test Method | Playwright CLI (`timezoneId: Etc/GMT`)      |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                   |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Fri Apr 03 2026 20:10:57 GMT+0000 (Greenwich Mean Time)"` — GMT+0000 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                    |
| Field lookup | `getValueObjectValue('DataField1')` non-empty               | Date object `"2026-04-03T20:10:55.302Z"` — auto-populated ✓              |

## Step Results

| Step # | Expected                         | Actual                                     | Match |
| ------ | -------------------------------- | ------------------------------------------ | ----- |
| 2      | Display today's UTC date         | `04/03/2026`                               | PASS  |
| 3      | UTC ISO string with today's date | `"2026-04-03T20:10:55.302Z"` (Date object) | PASS  |
| 4      | Raw local date = today           | `"04/03/2026"` = `"04/03/2026"`            | PASS  |
| 5      | GFV = raw ISO                    | `"2026-04-03T20:10:55.302Z"` (Date object) | PASS  |

## Outcome

**PASS** — Config A Current Date trivially correct at UTC+0. Local date always equals UTC date — no conversion issues possible. Display shows today's date, raw is a UTC Date object, and GFV returns the raw value unchanged.

## Findings

- **UTC+0 control for Config A Current Date**: At UTC+0, no cross-midnight edge case exists — local date always equals UTC date. This serves as the baseline control
- **Completes the TZ spectrum for 6-A**: BRT (PASS), IST (PASS), UTC0 (PASS). Config A Current Date passes universally because `new Date()` bypasses all timezone-sensitive parsing
- **GFV returns raw Date unchanged**: For date-only fields at UTC+0, `getCalendarFieldValue()` returns the stored value as-is
- **No Bug #5 or #7 involvement**: Current Date init path uses `new Date()` directly. Config A has `ignoreTimezone=false` so GFV uses the clean `new Date(value).toISOString()` path
