# TC-7-C-usFormat — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-7-C-usFormat.md](tasks/date-handling/forms-calendar/test-cases/tc-7-C-usFormat.md) | **Summary**: [summary](../summaries/tc-7-C-usFormat.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Browser     | Chromium (Playwright headless)                   |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                    | Result                                                         |
| ------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                    | `"...GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                | `false` → V1 active ✓                                          |
| Field lookup | filter by enableTime=true, ignoreTimezone=false, useLegacy=false, enableInitialValue=false | `["Field6"]` ✓                                                 |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS  |
| api    | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — US format `"03/15/2026"` parsed as local BRT midnight. Stored as local time. GFV correctly reconstructs UTC.

## Findings

- US format string behaves identically to date-only ISO and ISO-without-Z inputs
- `moment("03/15/2026").toDate()` parses as local midnight — same as all non-Z string formats
- Config C input-format agnostic for all midnight-resolving inputs
- Batch-verified alongside dateOnly, dateObj, usFormatTime, epoch — all identical results
