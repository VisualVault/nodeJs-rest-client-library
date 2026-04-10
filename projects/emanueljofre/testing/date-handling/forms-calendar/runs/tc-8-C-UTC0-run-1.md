# TC-8-C-UTC0 — Run 1 | 2026-04-03 | UTC0 | PASS

**Spec**: [tc-8-C-UTC0.md](tasks/date-handling/forms-calendar/test-cases/tc-8-C-UTC0.md) | **Summary**: [summary](../summaries/tc-8-C-UTC0.md)

## Environment

| Parameter   | Value                                       |
| ----------- | ------------------------------------------- |
| Date        | 2026-04-03                                  |
| Browser     | Chromium (Playwright headless)              |
| Tester TZ   | Etc/GMT — UTC+0                             |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform    | VisualVault FormViewer                      |
| Test Method | Playwright CLI (`timezoneId: Etc/GMT`)      |

## Preconditions Verified

| Check        | Command                                                                                 | Result                                             |
| ------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                 | `"...GMT+0000 (Greenwich Mean Time)"` — GMT+0000 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                             | `false` → V1 active ✓                              |
| Field lookup | filter enableTime=true, ignoreTimezone=false, useLegacy=false, enableInitialValue=false | `["Field6"]` ✓                                     |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS  |
| api    | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Config C GFV at UTC+0: `new Date("2026-03-15T00:00:00").toISOString()` produces stored+Z, which at UTC+0 equals `"2026-03-15T00:00:00.000Z"`. Real UTC conversion trivially correct at UTC boundary.

## Findings

- Completes Config C 3-TZ spectrum: BRT (+3h), IST (-5:30h from previous day), UTC0 (+0h = stored+Z)
- At UTC+0, Config C and Config D produce identical GFV output — distinguishable only by comparing with non-zero-offset TZs
- Config C GFV is consistent and correct across all tested timezones
- No bugs exercised
