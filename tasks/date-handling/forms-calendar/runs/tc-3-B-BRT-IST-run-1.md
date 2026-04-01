# TC-3-B-BRT-IST — Run 1 | 2026-04-01 | IST | PASS

**Spec**: [tc-3-B-BRT-IST.md](../test-cases/tc-3-B-BRT-IST.md) | **Summary**: [summary](../summaries/tc-3-B-BRT-IST.md)

## Environment

| Parameter   | Value                                                         |
| ----------- | ------------------------------------------------------------- |
| Date        | 2026-04-01                                                    |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)                                |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                   |
| Platform    | VisualVault FormViewer, Build 20260304.1                      |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta` via CDP override) |

## Preconditions Verified

| Check        | Command                                                                                                | Result                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                                | `"Wed Apr 01 2026 20:21:07 GMT+0530 (India Standard Time)"` — GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                            | `false` → V1 active ✓                                                    |
| Field lookup | filter: fieldType=13, enableTime=false, ignoreTimezone=true, useLegacy=false, enableInitialValue=false | `["DataField10"]` ✓                                                      |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| 2      | `DateTest-000107 Rev 1`      | `DateTest-000107 Rev 1`      | PASS  |
| 3      | Display: `03/15/2026`        | Display: `03/15/2026`        | PASS  |
| 4      | Raw: `"2026-03-15"`          | `"2026-03-15"`               | PASS  |
| 5      | GFV: `"2026-03-15"`          | `"2026-03-15"`               | PASS  |
| 6      | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS  |

## Outcome

**PASS** — All steps match expected values. BRT-saved date-only string survives cross-TZ reload in IST without shift.

## Findings

- Config B (`ignoreTimezone=true`) date-only field survives cross-TZ reload identically to Config A — `ignoreTZ` flag is inert when `enableTime=false`
- Raw value `"2026-03-15"` unchanged despite IST (UTC+5:30) reload — the form load path does not re-parse date-only strings through a Date constructor
- GFV matches raw — Bug #5 (fake Z) correctly does not apply to `enableTime=false` fields
- Bug #7 prediction disproved: same result as tc-3-A-BRT-IST — date-only strings are not re-parsed as local midnight on load
- Saved record DateTest-000107 (Config B, BRT) confirmed usable for cross-TZ tests
- Note: IST timezone was set via CDP `Emulation.setTimezoneOverride` (initial run); config files updated to nested `browser.contextOptions.timezoneId` format for future runs
- Recommended next: Run 3-B-IST-BRT to verify reverse cross-TZ behavior
