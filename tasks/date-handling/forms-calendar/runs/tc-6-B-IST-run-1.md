# TC-6-B-IST — Run 1 | 2026-04-03 | IST | PASS

**Spec**: [tc-6-B-IST.md](../test-cases/tc-6-B-IST.md) | **Summary**: [summary](../summaries/tc-6-B-IST.md)

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
| Field lookup | `getValueObjectValue('DataField28')` non-empty              | Date object `"2026-04-03T20:20:54.094Z"` — auto-populated ✓              |

## Step Results

| Step # | Expected                         | Actual                                     | Match |
| ------ | -------------------------------- | ------------------------------------------ | ----- |
| 2      | Display today's IST date         | `04/04/2026`                               | PASS  |
| 3      | UTC ISO string with today's date | `"2026-04-03T20:20:54.094Z"` (Date object) | PASS  |
| 4      | Raw local date = today IST       | `"04/04/2026"` = `"04/04/2026"`            | PASS  |
| 5      | GFV = raw ISO                    | `"2026-04-03T20:20:54.094Z"` (Date object) | PASS  |

## Outcome

**PASS** — Config B Current Date correct in IST. `ignoreTimezone=true` has no effect on the `new Date()` init path. Display shows today's IST date (April 4), raw is a UTC Date object (April 3 UTC = April 4 IST), and GFV returns the raw value unchanged. Cross-midnight edge active: IST date (April 4) differs from UTC date (April 3).

## Findings

- **Cross-midnight confirmed**: IST 01:50 = UTC 20:20 previous day. Display correctly shows IST date `04/04/2026`, raw UTC is `2026-04-03T20:20:54.094Z` — the IST interpretation of the UTC timestamp matches today's IST date
- **ignoreTZ=true is inert on Current Date path**: Same behavior as 6-A-IST. `new Date()` bypasses all timezone-sensitive parsing
- **GFV returns raw Date unchanged**: For date-only fields (`enableTime=false`), `getCalendarFieldValue()` returns the stored value as-is
- Current Date uses `new Date()` directly — no `moment(e).toDate()` parsing, no Bug #7 involvement
