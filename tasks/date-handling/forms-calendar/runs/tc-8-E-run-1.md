# TC-8-E — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-8-E.md](../test-cases/tc-8-E.md) | **Summary**: [summary](../summaries/tc-8-E.md)

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

| Check        | Command                                                                                 | Result                                                |
| ------------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                 | `"...GMT-0300 (Brasilia Standard Time)"` — GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                             | `false` → V1 active ✓                                 |
| Field lookup | filter enableTime=false, ignoreTimezone=false, useLegacy=true, enableInitialValue=false | `["Field12"]` ✓                                       |

## Step Results

| Step # | Expected       | Actual         | Match |
| ------ | -------------- | -------------- | ----- |
| raw    | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| api    | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — Legacy date-only Config E returns raw value unchanged. Identical to non-legacy Config A.

## Findings

- `useLegacy=true` has no effect on date-only GFV — the `enableTime=false` path returns raw before reaching any legacy/non-legacy branching
- Confirms all 4 date-only configs (A, B, E, F) produce identical GFV behavior: raw string returned as-is
- TZ-independent — date-only GFV is unaffected by browser timezone
