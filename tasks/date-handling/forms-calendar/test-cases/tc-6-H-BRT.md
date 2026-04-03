# TC-6-H-BRT — Config H, Current Date, BRT: legacy DateTime + ignoreTZ correct; no Bug #5 (useLegacy safe)

## Environment Specs

| Parameter               | Required Value                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                   |
| **System Timezone**     | America/Sao_Paulo — UTC-3, BRT. No DST since 2019 (fixed UTC-3 year-round).                |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                   |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                   |
| **Target Field Config** | `enableTime=true, ignoreTimezone=true, useLegacy=true, enableInitialValue=true`            |
| **Scenario**            | Current Date default — field auto-populates with today's date and time on fresh form load. |

## Preconditions

| #   | Check                            | Details                                                                                                                                                                                                                                       |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Set system timezone              | macOS: `sudo systemsetup -settimezone America/Sao_Paulo` · Windows: `tzutil /s "E. South America Standard Time"` · PowerShell: `Set-TimeZone -Id "E. South America Standard Time"` · Linux: `sudo timedatectl set-timezone America/Sao_Paulo` |
| P2  | Restart Chrome                   | Close all Chrome windows and relaunch to pick up new TZ.                                                                                                                                                                                      |
| P3  | Verify browser timezone          | `new Date().toString()` contains `GMT-0300`                                                                                                                                                                                                   |
| P4  | Open form template URL           | https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939                                                  |
| P5  | Verify code path                 | `useUpdatedCalendarValueLogic` = `false` → V1 active                                                                                                                                                                                          |
| P6  | Verify current date field exists | `VV.Form.VV.FormPartition.getValueObjectValue('Field26')` returns non-empty Date                                                                                                                                                              |

## Test Steps

| Step | Action                                                                    | Expected Result                                                                      |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | Load fresh form instance                                                  | Form loads; Field26 auto-populates with today's date and time                        |
| 2    | Read display value of Field26                                             | Shows today's date with time in BRT (e.g., `04/03/2026 05:20 PM`)                    |
| 3    | Read raw value: `VV.Form.VV.FormPartition.getValueObjectValue('Field26')` | Returns a Date object with valid UTC ISO string                                      |
| 4    | Read GFV: `VV.Form.getFieldValue('Field26')`                              | Returns same raw Date object (no fake Z — useLegacy bypasses Bug #5)                 |
| 5    | Confirm timezone context                                                  | Raw UTC timestamp, when converted to BRT (UTC-3), yields today's date and local time |

> **Note:** Config H has the same flags as Config D (`enableTime=true, ignoreTimezone=true`) but adds `useLegacy=true`. Non-legacy Config D (6-D-BRT) FAILS with Bug #5 (fake Z on GFV), but legacy Config H PASSES because `useLegacy=true` causes GFV to return the raw Date object, bypassing the `moment().format("[Z]")` path entirely.

## Fail Conditions

| ID     | Condition                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------- |
| FAIL-1 | Display shows wrong day or time (not today in BRT)                                              |
| FAIL-2 | Raw value is not a Date object with time component                                              |
| FAIL-3 | GFV returns a string with fake Z instead of raw Date (Bug #5 — should not occur with useLegacy) |
| FAIL-4 | `useUpdatedCalendarValueLogic` = `true` (V2 active instead of V1)                               |

## Related

- **Matrix row**: Category 6, Config H, BRT
- **Summary**: [tc-6-H-BRT summary](../summaries/tc-6-H-BRT.md)
- **Analysis**: [analysis.md](../../../date-handling/analysis.md)
- **Siblings**: tc-6-E-BRT, tc-6-F-BRT, tc-6-G-BRT (other BRT legacy configs)
- **Bug #5 comparison**: tc-6-D-BRT (FAIL — same flags minus useLegacy)
