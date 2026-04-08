# TC-11-load-Tokyo — Config D, Cross-TZ Reload, BRT→JST: +9h drift per trip; largest UTC+ Bug #5 offset tested

## Environment

| Parameter | Value                                                                                       |
| --------- | ------------------------------------------------------------------------------------------- |
| Timezone  | Asia/Tokyo — JST (UTC+9, no DST)                                                            |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`)                                                 |
| Config    | D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`) |
| Scenario  | BRT-saved record loaded in JST                                                              |

## Preconditions

- ☐ **P1** Set `Asia/Tokyo`
    - macOS: `sudo systemsetup -settimezone Asia/Tokyo`
    - Windows: `tzutil /s "Tokyo Standard Time"`
    - PowerShell: `Set-TimeZone -Id "Tokyo Standard Time"`
    - Linux: `sudo timedatectl set-timezone Asia/Tokyo`
- ☐ **P2** Restart browser
- ☐ **P3** Verify GMT+0900
- ☐ **P4** Saved record: `https://vvdemo.visualvault.com/FormViewer/app?DataID=901ce05d-b2f7-42e9-8569-7f9d4caf258d&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939`
- ☐ **P5** V1 active
- ☐ **P6** Config D → `["Field5"]`

> **Note**: DateTest-000080 saved from BRT, Config D = `"2026-03-15T00:00:00"`. JST is UTC+9, no DST ever.

## Test Steps

| Step # | Action                | Expected                                             |
| ------ | --------------------- | ---------------------------------------------------- |
| 1      | Complete setup        | All preconditions verified                           |
| 2      | Verify record         | `"DateTest-000080"`                                  |
| 3      | Capture raw           | `"2026-03-15T00:00:00"` (preserved)                  |
| 4      | Capture GFV           | `"2026-03-15T00:00:00"` (correct: no transformation) |
| 5      | GFV round-trip        | Set field value from GFV output                      |
| 6      | Capture post-trip raw | `"2026-03-15T00:00:00"` (correct: no drift)          |
| 7      | Capture post-trip GFV | `"2026-03-15T00:00:00"`                              |
| 8      | Capture Config A raw  | `"2026-03-15"` (date-only preserved)                 |
| 9      | toISOString ref       | `"2026-03-14T15:00:00.000Z"` confirms JST            |

## Fail Conditions

| ID     | Condition        | Detail                                                                                                                                                                                                                                    |
| ------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FAIL-1 | Bug #5 +9h drift | Step 4 returns `"2026-03-15T00:00:00.000Z"` (fake Z). Step 6 returns `"2026-03-15T09:00:00"` instead of `"2026-03-15T00:00:00"`. JST +9h drift — the largest positive drift tested. Fake Z `"T00:00:00.000Z"` → UTC midnight → JST 09:00. |
| FAIL-2 | Wrong TZ         | System not reporting GMT+0900                                                                                                                                                                                                             |
| FAIL-3 | V2 active        | `useUpdatedCalendarValueLogic = true` instead of V1                                                                                                                                                                                       |
| FAIL-4 | Field not found  | Config D field `["Field5"]` missing or misconfigured                                                                                                                                                                                      |

## Related

- Matrix row `11-load-Tokyo` | `11-load-PST` (-7h) | `11-load-UTC0` (0h) | `9-D-JST-1` (+9h single trip) if exists
- Bug #5 analysis
