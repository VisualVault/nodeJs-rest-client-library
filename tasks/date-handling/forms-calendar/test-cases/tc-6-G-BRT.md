# TC-6-G-BRT — Config G, Current Date, BRT: legacy DateTime auto-populated with UTC; GFV returns raw Date

## Environment Specs

| Parameter               | Required Value                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                   |
| **System Timezone**     | America/Sao_Paulo — UTC-3, BRT. No DST since 2019 (fixed UTC-3 year-round).                |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                   |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                   |
| **Target Field Config** | `enableTime=true, ignoreTimezone=false, useLegacy=true, enableInitialValue=true`           |
| **Scenario**            | Current Date default — field auto-populates with today's date and time on fresh form load. |

## Preconditions

| #   | Check                            | Details                                                                                                                                                                                                                                       |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Set system timezone              | macOS: `sudo systemsetup -settimezone America/Sao_Paulo` · Windows: `tzutil /s "E. South America Standard Time"` · PowerShell: `Set-TimeZone -Id "E. South America Standard Time"` · Linux: `sudo timedatectl set-timezone America/Sao_Paulo` |
| P2  | Restart Chrome                   | Close all Chrome windows and relaunch to pick up new TZ.                                                                                                                                                                                      |
| P3  | Verify browser timezone          | `new Date().toString()` contains `GMT-0300`                                                                                                                                                                                                   |
| P4  | Open form template URL           | https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939                                                  |
| P5  | Verify code path                 | `useUpdatedCalendarValueLogic` = `false` → V1 active                                                                                                                                                                                          |
| P6  | Verify current date field exists | `VV.Form.VV.FormPartition.getValueObjectValue('Field25')` returns non-empty Date                                                                                                                                                              |

## Test Steps

| Step | Action                                                                    | Expected Result                                                                      |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | Load fresh form instance                                                  | Form loads; Field25 auto-populates with today's date and time                        |
| 2    | Read display value of Field25                                             | Shows today's date with time in BRT (e.g., `04/03/2026 05:20 PM`)                    |
| 3    | Read raw value: `VV.Form.VV.FormPartition.getValueObjectValue('Field25')` | Returns a Date object with valid UTC ISO string                                      |
| 4    | Read GFV: `VV.Form.getFieldValue('Field25')`                              | Returns same raw Date object (no transformation)                                     |
| 5    | Confirm timezone context                                                  | Raw UTC timestamp, when converted to BRT (UTC-3), yields today's date and local time |

> **Note:** Legacy DateTime Current Date uses `new Date()` directly. The `useLegacy=true` flag affects GFV output (returns raw Date instead of formatted string), but the init path is identical to Config C.

## Fail Conditions

| ID     | Condition                                                         |
| ------ | ----------------------------------------------------------------- |
| FAIL-1 | Display shows wrong day or time (not today in BRT)                |
| FAIL-2 | Raw value is not a Date object with time component                |
| FAIL-3 | GFV does not return raw Date object                               |
| FAIL-4 | `useUpdatedCalendarValueLogic` = `true` (V2 active instead of V1) |

## Related

- **Matrix row**: Category 6, Config G, BRT
- **Summary**: [tc-6-G-BRT summary](../summaries/tc-6-G-BRT.md)
- **Analysis**: [analysis.md](../../../date-handling/analysis.md)
- **Siblings**: tc-6-E-BRT, tc-6-F-BRT, tc-6-H-BRT (other BRT legacy configs)
