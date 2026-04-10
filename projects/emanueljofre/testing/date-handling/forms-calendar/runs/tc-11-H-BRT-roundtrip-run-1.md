# TC-11-H-BRT-roundtrip — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-11-H-BRT-roundtrip.md](tasks/date-handling/forms-calendar/test-cases/tc-11-H-BRT-roundtrip.md) | **Summary**: [summary](../summaries/tc-11-H-BRT-roundtrip.md)

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
| TZ           | `new Date().toString()`                                     | `"Wed Apr 08 2026 16:23:50 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | Config H filter                                             | `["Field13"]` ✓                                                                      |

## Step Results

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| 3      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| 4      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| 6      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| 8      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| 10     | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| 11     | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — Zero drift after 3 GFV round-trips. Config H (`useLegacy=true`) GFV returns raw stored value without fake Z transformation. SFV(GFV()) is identity for all trips.

## Findings

- Confirmed: `useLegacy=true` prevents FORM-BUG-5 cumulative drift across multiple round-trips
- All 3 trips: raw unchanged at `"2026-03-15T00:00:00"`, GFV unchanged at `"2026-03-15T00:00:00"`
- GFV returns raw value (no `toISOString()`, no `moment().format()`) — the legacy path bypasses both Bug #5 and Bug #6 mechanisms
- Extends `9-H-BRT-1` (1-trip) proof to multi-trip stability
- Contrast: Config D (`9-D-BRT-3`, 3 trips) shows -9h cumulative drift — same flags except `useLegacy=false`
- `useLegacy=true` is a confirmed mitigation for FORM-BUG-5 in cross-timezone scenarios
