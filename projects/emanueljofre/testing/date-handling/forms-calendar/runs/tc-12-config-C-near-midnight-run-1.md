# TC-12-config-C-near-midnight — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-12-config-C-near-midnight.md](tasks/date-handling/forms-calendar/test-cases/tc-12-config-C-near-midnight.md) | **Summary**: [summary](../summaries/tc-12-config-C-near-midnight.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-08                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Wed Apr 08 2026 16:01:50 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | Config C filter                                             | `["Field6"]` ✓                                                                       |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| 3      | `"2026-03-15T23:00:00"`      | `"2026-03-15T23:00:00"`      | PASS  |
| 4      | `"2026-03-16T02:00:00.000Z"` | `"2026-03-16T02:00:00.000Z"` | PASS  |
| 6      | `"2026-03-15T23:00:00"`      | `"2026-03-15T23:00:00"`      | PASS  |
| 7      | `"2026-03-16T02:00:00.000Z"` | `"2026-03-16T02:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Config C round-trip at near-midnight is perfectly stable. 0 drift after 1 trip. GFV returns real UTC (`"2026-03-16T02:00:00.000Z"` = 23:00 BRT + 3h), SFV parses it back to the same local time.

## Findings

- Confirmed: Config C (`ignoreTimezone=false`) uses real UTC conversion via `new Date(value).toISOString()` — no fake Z
- Round-trip is mathematically stable: GFV(real UTC) → SFV(real UTC) → same local time → same raw value
- Contrast with Config D (`12-near-midnight-2`): same input `"2026-03-15T23:00:00"` drifts -3h per trip due to FORM-BUG-5 fake Z
- This proves FORM-BUG-5 drift is caused by `ignoreTimezone=true` (fake Z), not by `enableTime=true` alone
- Near-midnight timing is irrelevant for Config C — stability holds regardless of time value
- No further action — control test closed
