# TC-1-B-BRT — Run 2 | 2026-04-01 | BRT | PASS

**Spec**: [tc-1-B-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-1-B-BRT.md) | **Summary**: [summary](../summaries/tc-1-B-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-01                                       |
| Tester TZ   | `America/Sao_Paulo` — UTC-3 (BRT)                |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                    | Result                                                                               |
| ------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                    | `"Wed Apr 01 2026 10:44:56 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                | `false` → V1 active ✓                                                                |
| Field lookup | filter by enableTime=false, ignoreTimezone=true, useLegacy=false, enableInitialValue=false | `["DataField10"]` ✓                                                                  |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| 3      | Field displays `03/15/2026`  | `03/15/2026`                 | PASS  |
| 4      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 5      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 6      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Config B (date-only, ignoreTZ=true) in BRT stores `"2026-03-15"` correctly. GetFieldValue returns same value with no transformation. `ignoreTimezone=true` has no effect on date-only fields.

## Findings

- Actual matches matrix prediction: `"2026-03-15"` stored and returned correctly.
- No bugs triggered: Bug #7 does not affect BRT (UTC-3 midnight is same UTC day). Bug #5 does not apply (enableTime=false).
- Config B identical to Config A (tc-1-A-BRT) — confirms ignoreTZ is inert for date-only fields regardless of timezone.
- This is the first Playwright CLI run for Config B BRT (Run 1 was via Chrome MCP extension ~2026-03-27).
- No sibling corrections needed.
