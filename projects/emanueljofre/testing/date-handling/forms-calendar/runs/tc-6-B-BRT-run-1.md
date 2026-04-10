# TC-6-B-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-6-B-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-6-B-BRT.md) | **Summary**: [summary](../summaries/tc-6-B-BRT.md)

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
| Field lookup | `getValueObjectValue('DataField28')` non-empty              | Date object `"2026-04-03T20:10:00.472Z"` — auto-populated ✓                 |

## Step Results

| Step # | Expected                         | Actual                                     | Match |
| ------ | -------------------------------- | ------------------------------------------ | ----- |
| 2      | Display today's BRT date         | `04/03/2026`                               | PASS  |
| 3      | UTC ISO string with today's date | `"2026-04-03T20:10:00.472Z"` (Date object) | PASS  |
| 4      | Raw local date = today           | `"04/03/2026"` = `"04/03/2026"`            | PASS  |
| 5      | GFV = raw ISO                    | `"2026-04-03T20:10:00.472Z"` (Date object) | PASS  |

## Outcome

**PASS** — Config B Current Date correct in BRT. `ignoreTimezone=true` has no effect on the `new Date()` init path. Display shows today's BRT date, raw is a UTC Date object, and GFV returns the raw value unchanged.

## Findings

- **ignoreTZ=true is inert on Current Date path**: The initialization uses `new Date()` directly, bypassing all timezone-sensitive parsing. The `ignoreTimezone` flag has no opportunity to apply
- **GFV returns raw Date unchanged**: For date-only fields (`enableTime=false`), `getCalendarFieldValue()` returns the stored value as-is — no fake Z transformation
- **Identical behavior to Config A (6-A-BRT)**: Config B differs from Config A only in `ignoreTimezone=true`, which is irrelevant on the Current Date init path. Both produce the same correct result
- Current Date uses `new Date()` directly — no `moment(e).toDate()` parsing, no Bug #7 involvement
