# TC-3-A-BRT-BRT — Run 4 | 2026-04-01 | BRT | PASS

**Spec**: [tc-3-A-BRT-BRT.md](../test-cases/tc-3-A-BRT-BRT.md) | **Summary**: [summary](../summaries/tc-3-A-BRT-BRT.md)

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
| TZ           | `new Date().toString()`                                                                     | `"Wed Apr 01 2026 10:54:54 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                 | `false` → V1 active ✓                                                                |
| Field lookup | filter by enableTime=false, ignoreTimezone=false, useLegacy=false, enableInitialValue=false | `["DataField7"]` ✓                                                                   |

## Step Results

Pre-save (fresh form DateTest-000105, SetFieldValue('DataField7', '03/15/2026')):

| Step # | Expected       | Actual         | Match |
| ------ | -------------- | -------------- | ----- |
| 3      | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| 4      | `"2026-03-15"` | `"2026-03-15"` | PASS  |

Post-reload (saved record DateTest-000080 Rev 2, loaded in BRT):

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| 7      | Display `03/15/2026`         | `03/15/2026`                 | PASS  |
| 8      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 9      | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| 10     | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Config A date-only value survives save/reload cycle in BRT. Display, raw, and GFV are identical pre-save and post-reload.

## Findings

- Fourth consecutive PASS for this TC (runs 1-4 across Chrome MCP and Playwright CLI).
- Post-reload: `"2026-03-15"` raw and GFV match pre-save values exactly.
- Used saved record DateTest-000080 (saved from BRT 2026-03-31) for the reload step.
- No bugs triggered: Bug #7 does not affect BRT, Config A is outside Bug #5 surface.
- First Playwright CLI run for this TC.
