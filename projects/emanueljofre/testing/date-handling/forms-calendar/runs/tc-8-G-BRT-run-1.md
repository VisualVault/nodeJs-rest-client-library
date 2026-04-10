# TC-8-G-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-8-G-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-8-G-BRT.md) | **Summary**: [summary](../summaries/tc-8-G-BRT.md)

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

| Check        | Command                                                                                | Result                                                |
| ------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                | `"...GMT-0300 (Brasilia Standard Time)"` — GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                            | `false` → V1 active ✓                                 |
| Field lookup | filter enableTime=true, ignoreTimezone=false, useLegacy=true, enableInitialValue=false | `["Field14"]` ✓                                       |

## Step Results

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| api    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — Legacy DateTime Config G returns raw value unchanged. No UTC conversion, no fake Z. `useLegacy=true` bypasses the entire non-legacy GFV branch.

## Findings

- **Matrix prediction corrected**: Expected was `"2026-03-15T03:00:00.000Z"` (real UTC, same as Config C). Actual is `"2026-03-15T00:00:00"` (raw unchanged). The prediction assumed `ignoreTimezone=false` would trigger UTC conversion, but `useLegacy=true` skips the branch before the `ignoreTimezone` check is reached.
- Config G behaves identically to Config H for GFV — both legacy DateTime configs return raw value regardless of `ignoreTimezone` flag
- `useLegacy=true` is the dominant flag: it bypasses both Bug #5 (fake Z on D) and the legitimate UTC conversion (on C). Legacy DateTime always returns raw.
- The `ignoreTimezone` flag is only relevant within the non-legacy branch (`!useLegacy && enableTime`)
