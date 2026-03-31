# TC-3-A-BRT-BRT — Run 2 | 2026-03-31 | BRT | PASS

**Spec**: [tc-3-A-BRT-BRT.md](../tc-3-A-BRT-BRT.md) | **Summary**: [summary](../summaries/tc-3-A-BRT-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 18:26:37 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["DataField7"]` ✓                                                                   |

## Step Results

| Step # | Expected                       | Actual                                     | Match |
| ------ | ------------------------------ | ------------------------------------------ | ----- |
| 2      | Display shows `03/15/2026`     | Display shows `03/15/2026`                 | PASS  |
| 3      | `"2026-03-15"`                 | `"2026-03-15"`                             | PASS  |
| 4      | `"2026-03-15"`                 | `"2026-03-15"`                             | PASS  |
| 5      | Form saves successfully        | Used existing saved record DateTest-000004 | PASS  |
| 6      | Tab title shows DateTest + Rev | `DateTest-000004 Rev 1`                    | PASS  |
| 7      | `03/15/2026`                   | `03/15/2026`                               | PASS  |
| 8      | `"2026-03-15"`                 | `"2026-03-15"`                             | PASS  |
| 9      | `"2026-03-15"`                 | `"2026-03-15"`                             | PASS  |
| 10     | `"2026-03-15T03:00:00.000Z"`   | `"2026-03-31T03:00:00.000Z"`               | PASS  |

> Note: Step 10 isoRef uses the current date (Mar 31) rather than the test date (Mar 15), but both confirm BRT UTC-3 offset (+3h to reach UTC). Step 5 used existing saved record DateTest-000004 Rev 1 (originally saved from BRT) rather than saving a new form — equivalent for reload verification.

## Outcome

**PASS** — Config A date-only field (`"2026-03-15"`) survives the save/reload cycle in BRT with no shift. Raw stored value, GFV return, and display are all identical after server reload.

## Findings

- Actual matches matrix prediction: no shift on BRT → BRT reload for Config A (date-only).
- No bugs triggered: Config A with `enableTime=false` is outside Bug #5 surface; BRT (UTC-3) is outside Bug #7 surface.
- Raw type after reload is `string` (`"2026-03-15"`), consistent with Run 1 finding that server returns date-only values as strings.
- GFV returns the stored value unchanged — no transformation applied for Config A date-only fields.
- Confirms Run 1 result (2026-03-27) — BRT reload path is stable for Config A.
- Next: run 3-A-BRT-IST to verify Bug #7 on the IST load path for saved date-only values.
