# TC-7-C-dateOnly — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-7-C-dateOnly.md](tasks/date-handling/forms-calendar/test-cases/tc-7-C-dateOnly.md) | **Summary**: [summary](../summaries/tc-7-C-dateOnly.md)

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

**PASS** — Date-only string input stores BRT midnight as local time. GFV correctly reconstructs UTC (+3h).

## Findings

- Date-only string `"2026-03-15"` parsed as local midnight via `moment("2026-03-15").toDate()` — same result as ISO-without-Z
- Config C handles all non-Z string formats identically: parse as local → store local → GFV returns real UTC
- No bugs exercised — Config C remains clean for all tested input formats
- Batch-verified alongside dateObj, usFormat, usFormatTime, epoch — all identical results
