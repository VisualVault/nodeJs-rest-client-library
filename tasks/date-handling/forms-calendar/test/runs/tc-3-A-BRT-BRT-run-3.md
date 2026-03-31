# TC-3-A-BRT-BRT — Run 3 | 2026-03-31 | BRT | PASS

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
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 18:44:32 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["DataField7"]` ✓                                                                   |

## Step Results

| Step # | Expected                         | Actual                                                           | Match |
| ------ | -------------------------------- | ---------------------------------------------------------------- | ----- |
| 2      | Display `03/15/2026`             | `03/15/2026`                                                     | PASS  |
| 3      | `"2026-03-15"` (pre-save)        | `"2026-03-15"`                                                   | PASS  |
| 4      | `"2026-03-15"` (pre-save GFV)    | `"2026-03-15"`                                                   | PASS  |
| 5      | Save succeeds                    | `IsFormSaved: true`, `UnsavedChanges: 0`, DataID: `2c2e9776-...` | PASS  |
| 6      | Reload shows DateTest Rev 1      | `DateTest-000079 Rev 1`                                          | PASS  |
| 8      | `"2026-03-15"` (post-reload)     | `"2026-03-15"`                                                   | PASS  |
| 9      | `"2026-03-15"` (post-reload GFV) | `"2026-03-15"`                                                   | PASS  |
| 10     | `"2026-03-15T03:00:00.000Z"`     | `"2026-03-15T03:00:00.000Z"`                                     | PASS  |

> **Full save-then-reload cycle**: Unlike Run 2 (which used existing DateTest-000004), this run set the value on a fresh form (DateTest-000079) via SetFieldValue, saved it, then loaded the saved record in a separate tab via DataID URL. This validates the complete save → server → reload pipeline on the current template.

## Outcome

**PASS** — Config A date-only field survives the full save-then-reload cycle on the current template. Pre-save and post-reload values are identical.

## Findings

- Full save-then-reload cycle confirmed on current template (DateTest-000079) — no regression from template changes since DateTest-000004.
- Save detection via `VV.Form.DataID` / `VV.Form.IsFormSaved` works reliably for automation.
- Pre-save raw `"2026-03-15"` = post-reload raw `"2026-03-15"` — save does not corrupt the value.
- No bugs triggered (Config A in BRT is outside Bug #5 and Bug #7 surfaces).
