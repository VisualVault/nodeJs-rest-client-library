# TC-6-E-IST — Run 1 | 2026-04-03 | IST | PASS

**Spec**: [tc-6-E-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-6-E-IST.md) | **Summary**: [summary](../summaries/tc-6-E-IST.md)

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
| Field lookup | `getValueObjectValue('Field23')` non-empty                  | Date object `"2026-04-03T20:20:54.092Z"` — auto-populated ✓              |

## Step Results

| Step # | Expected                         | Actual                                     | Match |
| ------ | -------------------------------- | ------------------------------------------ | ----- |
| 2      | Display today's IST date         | `04/04/2026`                               | PASS  |
| 3      | UTC ISO string with today's date | `"2026-04-03T20:20:54.092Z"` (Date object) | PASS  |
| 4      | Raw local date = today IST       | `"04/04/2026"` = `"04/04/2026"`            | PASS  |
| 5      | GFV = raw ISO                    | `"2026-04-03T20:20:54.092Z"` (Date object) | PASS  |

## Outcome

**PASS** — Config E legacy Current Date correct in IST. `useLegacy=true` has no effect on the `new Date()` init path. Display shows today's IST date, raw is a UTC Date object, and GFV returns the raw value unchanged. Cross-midnight edge active.

## Findings

- **KEY FINDING: No Bug #7 on Current Date path**: Unlike preset 5-E-IST (FAILS with Bug #7), Current Date uses `new Date()` directly, bypassing `moment(e).toDate()` parsing entirely. `useLegacy=true` is inert on this init path
- **Cross-midnight confirmed**: IST 01:50 = UTC 20:20 previous day. Display shows `04/04/2026` (IST today), raw UTC is `2026-04-03T20:20:54.092Z` — correct
- **Compare with 5-E-IST**: Preset date goes through `moment(initialDate).toDate()` which triggers Bug #7 (-1 day in UTC+ zones). Current Date avoids this entirely
- GFV returns raw Date unchanged — legacy flag does not alter `getCalendarFieldValue()` behavior for date-only fields
