# TC-7-A-dateObj-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-7-A-dateObj-BRT.md](../test-cases/tc-7-A-dateObj-BRT.md) | **Summary**: [summary](../summaries/tc-7-A-dateObj-BRT.md)

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
| TZ           | `new Date().toString()`                                     | `"Fri Apr 03 2026 19:25:04 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["Field7"]` ✓                                                                       |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| api    | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| isoRef | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Date object `new Date(2026, 2, 15)` stores correctly in BRT. `moment(Date).toDate()` preserves local midnight → `getSaveValue()` extracts `"2026-03-15"`.

## Findings

- Date object input safe in BRT (UTC-). Matches predictions.
- No bugs confirmed — Config A date-only with Date object is safe in negative-offset timezones.
- IST sibling (`7-A-dateObj-IST`) confirmed double-shift (-2 days) — this BRT result is the control.
- All format variants for Config A BRT produce identical results, confirming format-agnostic behavior for date-only fields in UTC-.
