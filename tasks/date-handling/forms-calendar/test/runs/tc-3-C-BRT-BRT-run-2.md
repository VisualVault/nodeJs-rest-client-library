# TC-3-C-BRT-BRT — Run 2 | 2026-03-31 | BRT | PASS

**Spec**: [tc-3-C-BRT-BRT.md](../tc-3-C-BRT-BRT.md) | **Summary**: [summary](../summaries/tc-3-C-BRT-BRT.md)

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
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 18:32:39 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["DataField6"]` ✓                                                                   |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| 7      | `03/15/2026 12:00 AM`        | `03/15/2026 12:00 AM`        | PASS  |
| 8      | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS  |
| 9      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |
| 10     | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

> Note: Steps 2–6 (set value + save cycle) were not re-executed — used existing saved record DateTest-000004 Rev 1 (originally saved from BRT with DataField6 = `"2026-03-15T00:00:00"`). Steps 7–10 verify the reload path, which is the core of the Category 3 test.

## Outcome

**PASS** — Config C DateTime field survives the BRT save/reload cycle with no shift. Raw value `"2026-03-15T00:00:00"` unchanged; GFV correctly returns `"2026-03-15T03:00:00.000Z"` (proper UTC conversion); display `03/15/2026 12:00 AM` identical.

## Findings

- Actual matches matrix prediction and Run 1 (2026-03-27): no shift on BRT → BRT reload for Config C.
- Raw stored value type is `string` after reload (server returns DateTime as string `"2026-03-15T00:00:00"`).
- GFV applies correct UTC conversion: local midnight + BRT offset (+3h) = `T03:00:00.000Z`. This is expected `ignoreTimezone=false` behavior, not Bug #5.
- No bugs triggered: Config C with `ignoreTimezone=false` is outside Bug #5 surface; DateTime fields are outside Bug #7 surface.
- Confirms Run 1 result — BRT reload path is stable for Config C.
- Next: run 3-C-BRT-IST to verify cross-TZ reload behavior (BRT-saved record loaded from IST).
