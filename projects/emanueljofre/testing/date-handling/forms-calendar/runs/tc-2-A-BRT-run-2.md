# TC-2-A-BRT — Run 2 | 2026-04-01 | BRT | PASS

**Spec**: [tc-2-A-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-2-A-BRT.md) | **Summary**: [summary](../summaries/tc-2-A-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-01                                       |
| Tester TZ   | `America/Sao_Paulo` — UTC-3 (BRT)                |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                     | Result                                                                               |
| ------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                     | `"Wed Apr 01 2026 10:50:00 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                 | `false` → V1 active ✓                                                                |
| Field lookup | filter by enableTime=false, ignoreTimezone=false, useLegacy=false, enableInitialValue=false | `["DataField7"]` ✓                                                                   |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| 6      | Field displays `03/15/2026`  | `03/15/2026`                 | PASS  |
| 7      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 8      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 9      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Config A (date-only, enableTime=false) typed input in BRT stores `"2026-03-15"` correctly. No day shift. GetFieldValue returns raw value unchanged.

## Findings

- Actual matches matrix prediction: `"2026-03-15"` stored and returned correctly.
- No bugs triggered: Bug #7 does not affect BRT (UTC-3 midnight is same UTC day).
- Result matches popup (1-A-BRT) — Bug #2 absent for this config in BRT.
- First Playwright CLI run for this TC (Run 1 was via Chrome MCP ~2026-03-27).
- No sibling corrections needed.
