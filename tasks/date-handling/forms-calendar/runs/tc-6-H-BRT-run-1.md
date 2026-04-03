# TC-6-H-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-6-H-BRT.md](../test-cases/tc-6-H-BRT.md) | **Summary**: [summary](../summaries/tc-6-H-BRT.md)

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
| TZ           | `new Date().toString()`                                     | `"Fri Apr 03 2026 17:20:15 GMT-0300 (Brasilia Standard Time)"` — GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                       |
| Field lookup | `getValueObjectValue('Field26')` non-empty                  | Date object `"2026-04-03T20:20:07.986Z"` — auto-populated ✓                 |

## Step Results

| Step # | Expected                     | Actual                                     | Match |
| ------ | ---------------------------- | ------------------------------------------ | ----- |
| 2      | Display today with time      | `04/03/2026 05:20 PM`                      | PASS  |
| 3      | UTC ISO string — Date object | `"2026-04-03T20:20:07.986Z"` (Date object) | PASS  |
| 4      | GFV = raw Date (no fake Z)   | `"2026-04-03T20:20:07.986Z"` (Date object) | PASS  |

## Outcome

**PASS** — Config H legacy DateTime + ignoreTZ Current Date correct in BRT. No Bug #5 — `useLegacy=true` causes GFV to return the raw Date object, bypassing the `moment().format("[Z]")` path entirely.

## Findings

- **No Bug #5 on legacy Config H**: Non-legacy Config D (6-D-BRT) FAILS because GFV uses `moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")` which produces fake Z. Config H has the same flags (`enableTime=true, ignoreTimezone=true`) but `useLegacy=true` bypasses the formatting — GFV returns the raw Date object instead
- **useLegacy=true is protective**: The legacy path in `getCalendarFieldValue()` returns the stored value without transformation. This avoids both Bug #5 (fake Z) and Bug #6 (Invalid Date on empty)
- **Config H vs Config D**: Same init path (`new Date()`), same raw storage, different GFV output. Config D corrupts on output; Config H does not
- **Round-trip safe**: `SetFieldValue(GetFieldValue('Field26'))` would not drift because GFV returns a real Date object, not a fake-Z string
