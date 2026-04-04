# TC-8-F — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-8-F.md](../test-cases/tc-8-F.md) | **Summary**: [summary](../summaries/tc-8-F.md)

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
| Field lookup | filter enableTime=false, ignoreTimezone=true, useLegacy=true, enableInitialValue=false | `["Field11"]` ✓                                       |

## Step Results

| Step # | Expected       | Actual         | Match |
| ------ | -------------- | -------------- | ----- |
| raw    | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| api    | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — Legacy date-only + ignoreTZ Config F returns raw value unchanged. Identical to Config E, A, and B.

## Findings

- Both `useLegacy` and `ignoreTimezone` flags are inert for date-only GFV — the `enableTime=false` path returns raw before any flag-dependent branching
- All 4 date-only configs now confirmed: A (base), B (+ignoreTZ), E (+useLegacy), F (+both) — all identical GFV behavior
- Completes the date-only GFV matrix — no further date-only GFV tests needed
