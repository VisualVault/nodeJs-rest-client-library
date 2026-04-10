# TC-7-C-epoch — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-7-C-epoch.md](tasks/date-handling/forms-calendar/test-cases/tc-7-C-epoch.md) | **Summary**: [summary](../summaries/tc-7-C-epoch.md)

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

**PASS** — Epoch `1773543600000` (BRT midnight = 2026-03-15T03:00:00Z) stored as local time. GFV correctly reconstructs UTC.

## Findings

- Epoch input is unambiguous — `moment(1773543600000).toDate()` yields the exact same instant regardless of timezone
- In BRT, that instant is local midnight → stored as `"2026-03-15T00:00:00"`
- Config C GFV correctly adds +3h to reconstruct UTC
- Epoch is the most reliable input format — no string parsing ambiguity
- Batch-verified alongside dateOnly, dateObj, usFormat, usFormatTime — all identical results
