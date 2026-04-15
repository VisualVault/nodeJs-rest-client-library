# TC-6-E-BRT — Config E, Current Date, BRT: legacy date-only auto-populated correctly; GFV returns raw Date

## Environment Specs

| Parameter               | Required Value                                                                    |
| ----------------------- | --------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                          |
| **System Timezone**     | America/Sao_Paulo — UTC-3, BRT. No DST since 2019 (fixed UTC-3 year-round).       |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                          |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)          |
| **Target Field Config** | `enableTime=false, ignoreTimezone=false, useLegacy=true, enableInitialValue=true` |
| **Scenario**            | Current Date default — field auto-populates with today's date on fresh form load. |

## Preconditions

| #   | Check                            | Details                                                                                                                                                                                                                                       |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Set system timezone              | macOS: `sudo systemsetup -settimezone America/Sao_Paulo` · Windows: `tzutil /s "E. South America Standard Time"` · PowerShell: `Set-TimeZone -Id "E. South America Standard Time"` · Linux: `sudo timedatectl set-timezone America/Sao_Paulo` |
| P2  | Restart Chrome                   | Close all Chrome windows and relaunch to pick up new TZ.                                                                                                                                                                                      |
| P3  | Verify browser timezone          | `new Date().toString()` contains `GMT-0300`                                                                                                                                                                                                   |
| P4  | Open form template URL           | https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939                                                  |
| P5  | Verify code path                 | `useUpdatedCalendarValueLogic` = `false` → V1 active                                                                                                                                                                                          |
| P6  | Verify current date field exists | `VV.Form.VV.FormPartition.getValueObjectValue('Field23')` returns non-empty Date                                                                                                                                                              |

## Test Steps

| Step | Action                                                                    | Expected Result                                                       |
| ---- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1    | Load fresh form instance                                                  | Form loads; Field23 auto-populates with today's date                  |
| 2    | Read display value of Field23                                             | Shows today's local date (04/03/2026 in BRT)                          |
| 3    | Read raw value: `VV.Form.VV.FormPartition.getValueObjectValue('Field23')` | Returns a Date object with valid ISO string                           |
| 4    | Convert raw to local date                                                 | Local date portion matches today's BRT date (04/03/2026)              |
| 5    | Read GFV: `VV.Form.getFieldValue('Field23')`                              | Returns same raw Date object                                          |
| 6    | Confirm timezone context                                                  | Raw UTC timestamp, when converted to BRT (UTC-3), yields today's date |

## Fail Conditions

| ID     | Condition                                                               |
| ------ | ----------------------------------------------------------------------- |
| FAIL-1 | Display or local-date interpretation shows wrong day (not today in BRT) |
| FAIL-2 | Raw value is not a Date object                                          |
| FAIL-3 | UTC timestamp converts to wrong BRT date                                |
| FAIL-4 | `useUpdatedCalendarValueLogic` = `true` (V2 active instead of V1)       |

## Related

- **Matrix row**: Category 6, Config E, BRT
- **Summary**: [tc-6-E-BRT summary](../summaries/tc-6-E-BRT.md)
- **Analysis**: [analysis.md](../../../date-handling/analysis.md)
- **Siblings**: tc-6-F-BRT, tc-6-G-BRT, tc-6-H-BRT (other BRT legacy configs)
