# TC-7-B-dateObj-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-7-B-dateObj-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-7-B-dateObj-BRT.md) | **Summary**: [summary](../summaries/tc-7-B-dateObj-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Fri Apr 03 2026 20:05:15 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["Field10"]` ✓                                                                      |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| api    | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| isoRef | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Date object safe in BRT for Config B. Identical to Config A dateObj-BRT. BRT control for IST double-shift sibling.

## Findings

- Config B Date object identical to Config A dateObj-BRT. `ignoreTimezone` inert.
- IST sibling (`7-B-dateObj-IST`) will show Bug #7 double-shift (-2 days).
