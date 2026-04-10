# TC-5-A-PST — Run 1 | 2026-04-03 | PST | PASS

**Spec**: [tc-5-A-PST.md](tasks/date-handling/forms-calendar/test-cases/tc-5-A-PST.md) | **Summary**: [summary](../summaries/tc-5-A-PST.md)

## Environment

| Parameter   | Value                                                             |
| ----------- | ----------------------------------------------------------------- |
| Date        | 2026-04-03                                                        |
| Tester TZ   | America/Los_Angeles — UTC-7 (PDT, current) / UTC-8 (PST, March 1) |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                       |
| Platform    | VisualVault FormViewer, Build 20260304.1                          |
| Test Method | Playwright CLI (`timezoneId: America/Los_Angeles`)                |

## Preconditions Verified

| Check        | Command                                                                              | Result                                                                              |
| ------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                              | `"Fri Apr 03 2026 12:36:22 GMT-0700 (Pacific Daylight Time)"` — contains GMT-0700 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                          | `false` → V1 active ✓                                                               |
| Field lookup | filter by enableTime=false, ignoreTZ=false, useLegacy=false, enableInitialValue=true | `Field2` with initialDate `"2026-03-01T03:00:00Z"` ✓                                |

## Step Results

| Step # | Expected                                                   | Actual                                     | Match |
| ------ | ---------------------------------------------------------- | ------------------------------------------ | ----- |
| 2      | Display: `03/01/2026`                                      | `03/01/2026` (rawLocal = `"3/1/2026"`)     | PASS  |
| 3      | Raw `.toISOString()` = `"2026-03-01T08:00:00.000Z"`        | `"2026-03-01T08:00:00.000Z"` (Date object) | PASS  |
| 4      | GFV = Date `.toISOString()` = `"2026-03-01T08:00:00.000Z"` | `"2026-03-01T08:00:00.000Z"` (Date object) | PASS  |
| 5      | Save extraction = `"2026-03-01"`                           | `"2026-03-01"` (substring(0,10) of ISO)    | PASS  |
| 6      | isoRef = `"2026-03-01T08:00:00.000Z"`                      | `"2026-03-01T08:00:00.000Z"`               | PASS  |

## Outcome

**PASS** — Config A preset date loads correctly at PST (UTC-8). Negative offset preserves the UTC calendar date.

## Findings

- Raw Date at PST midnight (UTC-8): `"2026-03-01T08:00:00.000Z"`. UTC date = March 1 (same day). Save extraction: `"2026-03-01"` ✓.
- The isoRef confirms March 1 is in PST (UTC-8), not PDT (UTC-7). DST starts March 8, 2026 in America/Los_Angeles.
- Bug #7 absent: negative offset (UTC-8) produces UTC date ≥ local date, so `toISOString().substring(0,10)` always preserves the correct day. This is the deepest UTC- control tested for presets (BRT = UTC-3, PST = UTC-8).
- No Playwright project exists for PST — this test was verified via Playwright CLI but cannot be run in headless regression until a PST project is added to `playwright.config.js`.
