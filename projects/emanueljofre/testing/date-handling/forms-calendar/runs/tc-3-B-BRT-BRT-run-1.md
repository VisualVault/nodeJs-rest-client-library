# TC-3-B-BRT-BRT — Run 1 | 2026-04-01 | BRT | PASS

**Spec**: [tc-3-B-BRT-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-3-B-BRT-BRT.md) | **Summary**: [summary](../summaries/tc-3-B-BRT-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-01                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                                | Result                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                                | `"Wed Apr 01 2026 11:42:56 GMT-0300 (Brasilia Standard Time)"` — GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                            | `false` → V1 active ✓                                                       |
| Field lookup | filter: fieldType=13, enableTime=false, ignoreTimezone=true, useLegacy=false, enableInitialValue=false | `["DataField10"]` ✓                                                         |

## Step Results

| Step # | Expected                           | Actual                         | Match |
| ------ | ---------------------------------- | ------------------------------ | ----- |
| 2      | Display: `03/15/2026`              | Display: `03/15/2026`          | PASS  |
| 3      | Raw pre-save: `"2026-03-15"`       | `"2026-03-15"`                 | PASS  |
| 4      | GFV pre-save: `"2026-03-15"`       | `"2026-03-15"`                 | PASS  |
| 5      | Form saves successfully            | Saved as DateTest-000107 Rev 1 | PASS  |
| 7      | Display after reload: `03/15/2026` | `03/15/2026`                   | PASS  |
| 8      | Raw post-reload: `"2026-03-15"`    | `"2026-03-15"`                 | PASS  |
| 9      | GFV post-reload: `"2026-03-15"`    | `"2026-03-15"`                 | PASS  |
| 10     | `"2026-03-15T03:00:00.000Z"`       | `"2026-03-15T03:00:00.000Z"`   | PASS  |

## Outcome

**PASS** — All steps match expected values. Date-only value survives save/reload intact in BRT.

## Findings

- Config B (`ignoreTimezone=true`) stores and retrieves identically to Config A (`ignoreTimezone=false`) for date-only fields — `ignoreTZ` flag is inert when `enableTime=false`
- Raw value `"2026-03-15"` unchanged through save/reload cycle — no format transformation, no date shift
- GFV matches raw after reload — Bug #5 (fake Z) correctly does not apply to `enableTime=false` fields
- No bugs triggered — BRT (UTC-3) is not affected by Bug #7 (UTC+ only)
- DataID: `c63dea33-867e-49e2-b929-fb226b6d3933` — available for future cross-TZ test (3-B-BRT-IST)
- Recommended next: Run 3-B-BRT-IST to verify cross-TZ behavior matches 3-A-BRT-IST
