# TC-6-F-IST — Run 1 | 2026-04-03 | IST | PASS

**Spec**: [tc-6-F-IST.md](../test-cases/tc-6-F-IST.md) | **Summary**: [summary](../summaries/tc-6-F-IST.md)

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
| Field lookup | `getValueObjectValue('Field24')` non-empty                  | Date object `"2026-04-03T20:20:54.093Z"` — auto-populated ✓              |

## Step Results

| Step # | Expected                         | Actual                                     | Match |
| ------ | -------------------------------- | ------------------------------------------ | ----- |
| 2      | Display today's IST date         | `04/04/2026`                               | PASS  |
| 3      | UTC ISO string with today's date | `"2026-04-03T20:20:54.093Z"` (Date object) | PASS  |
| 4      | Raw local date = today IST       | `"04/04/2026"` = `"04/04/2026"`            | PASS  |
| 5      | GFV = raw ISO                    | `"2026-04-03T20:20:54.093Z"` (Date object) | PASS  |

## Outcome

**PASS** — Config F legacy Current Date correct in IST. Both `ignoreTZ=true` and `useLegacy=true` are inert on the `new Date()` init path. Display shows today's IST date, raw is a UTC Date object, and GFV returns the raw value unchanged. Cross-midnight edge active.

## Findings

- **ignoreTZ + useLegacy both inert on Current Date path**: `new Date()` bypasses all config-dependent parsing. Config F behaves identically to A, B, and E for Current Date
- **No Bug #7**: Same as 6-E-IST — preset path (5-F-IST) would trigger Bug #7, but Current Date avoids it
- **Cross-midnight confirmed**: IST 01:50 = UTC 20:20 previous day. Display `04/04/2026`, raw `2026-04-03T20:20:54.093Z` — correct
- All date-only Current Date fields (A, B, E, F) pass in IST — the `new Date()` init path is the only fully correct initialization in VisualVault
