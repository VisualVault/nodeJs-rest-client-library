# TC-3-D-BRT-IST — Run 3 | 2026-04-01 | IST | FAIL-3

**Spec**: [tc-3-D-BRT-IST.md](../test-cases/tc-3-D-BRT-IST.md) | **Summary**: [summary](../summaries/tc-3-D-BRT-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-04-01                                  |
| Tester TZ | `Asia/Calcutta` — UTC+5:30 (IST)            |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                                                   | Result                                                                            |
| ------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                   | `"Wed Apr 01 2026 04:49:01 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                               | `false` → V1 active ✓                                                             |
| Field lookup | filter by enableTime=true, ignoreTimezone=true, useLegacy=false, enableInitialValue=false | `["DataField5"]` ✓                                                                |

## Step Results

| Step # | Expected                     | Actual                       | Match    |
| ------ | ---------------------------- | ---------------------------- | -------- |
| 1      | All P1–P6 checks pass        | All P1–P6 checks pass        | PASS     |
| 2      | `DateTest-000080 Rev 2`      | `DateTest-000080 Rev 2`      | PASS     |
| 3      | `03/15/2026 12:00 AM`        | `03/15/2026 12:00 AM`        | PASS     |
| 4      | `"2026-03-15T00:00:00"`      | `"03/15/2026 00:00:00"`      | **FAIL** |
| 5      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| 6      | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-3** — Bug #5 confirmed: GFV returns `"2026-03-15T00:00:00.000Z"` (fake Z). Additionally, the raw stored value format changed from ISO (`"2026-03-15T00:00:00"`) to US format (`"03/15/2026 00:00:00"`) on IST reload — the date content is correct (March 15, midnight, no shift) but the internal representation was reformatted by the V1 form load path.

## Findings

- **Bug #5 confirmed on fresh record**: GFV appends fake Z — consistent with Run 2 (DateTest-000004) and code analysis.
- **Raw format change on reload**: The BRT-saved value `"2026-03-15T00:00:00"` (ISO) became `"03/15/2026 00:00:00"` (US format) after IST reload. This was NOT observed on the old DateTest-000004 record (Run 2 showed `"2026-03-15T00:00:00"` unchanged). Possible explanations: (a) Rev 2 vs Rev 1 triggers a different save path, (b) the form load path for Config D reformats the value depending on internal state, (c) the second save from template changed the storage format.
- **Date content is correct**: Despite the format change, the date is still March 15, 2026 midnight — no timezone shift. Display shows `03/15/2026 12:00 AM` correctly.
- **Display is TZ-invariant**: Same as BRT (`03/15/2026 12:00 AM`) — `ignoreTimezone=true` suppresses offset conversion.
- Run 1 (DateTest-000004, 2026-03-27): PASS (no fake Z observed — likely anomalous). Run 2 (DateTest-000004, 2026-04-01): FAIL-3. Run 3 (DateTest-000080, 2026-04-01): FAIL-3. Bug #5 is consistently reproducible.
