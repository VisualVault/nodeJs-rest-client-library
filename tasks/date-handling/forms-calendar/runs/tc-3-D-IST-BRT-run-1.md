# TC-3-D-IST-BRT — Run 1 | 2026-04-01 | BRT | PASS (FAIL-3)

**Spec**: [tc-3-D-IST-BRT.md](../test-cases/tc-3-D-IST-BRT.md) | **Summary**: [summary](../summaries/tc-3-D-IST-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-04-01                                  |
| Tester TZ | America/Sao_Paulo — UTC-3 (BRT)             |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 21:10:59 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["DataField5"]` ✓                                                                   |

## Step Results

| Step # | Expected                     | Actual                       | Match    |
| ------ | ---------------------------- | ---------------------------- | -------- |
| 2      | `DateTest-000084 Rev 1`      | `"DateTest-000084 Rev 1"`    | PASS     |
| 3      | `03/15/2026 12:00 AM`        | `03/15/2026 12:00 AM`        | PASS     |
| 4      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS     |
| 5      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| 6      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS     |

## Outcome

**PASS (FAIL-3)** — Raw stored value and display are correct and TZ-invariant across IST→BRT reload. Bug #5 (FAIL-3) active on GFV: fake Z suffix appended. This matches the sibling 3-D-BRT-IST result — Bug #5 is bidirectionally TZ-invariant.

## Findings

- Actual matches matrix prediction: "Display OK; GFV same fake Z (TZ-invariant)" — confirmed
- Raw value `"2026-03-15T00:00:00"` survives IST→BRT cross-TZ reload unchanged — Config D storage is truly TZ-invariant
- Bug #5 confirmed on BRT reload path — `GetFieldValue()` returns `"2026-03-15T00:00:00.000Z"` (fake Z), same as observed on IST reload (3-D-BRT-IST). Bug #5 is consistent regardless of save or load timezone
- This is the reverse direction of TC-3-D-BRT-IST; both directions produce identical behavior, confirming Config D's TZ-invariance claim
- Config A (DataField7) shows `03/14/2026` on BRT reload — Bug #7 damage from IST save is permanent (stored `"2026-03-14"` instead of `"2026-03-15"`)
- IST-saved record URL: `DataID=28e371b7-e4e2-456a-94ab-95105ad97d0e` (DateTest-000084, saved 2026-04-01 from IST)
- No further action needed for this TC — behavior fully characterized in both directions
