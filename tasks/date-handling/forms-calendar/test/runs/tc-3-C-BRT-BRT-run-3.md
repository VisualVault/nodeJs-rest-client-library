# TC-3-C-BRT-BRT — Run 3 | 2026-03-31 | BRT | PASS

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
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 18:44:32 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["DataField6"]` ✓                                                                   |

## Step Results

| Step # | Expected                                   | Actual                                                           | Match |
| ------ | ------------------------------------------ | ---------------------------------------------------------------- | ----- |
| 2      | Display `03/15/2026 12:00 AM`              | `03/15/2026 12:00 AM`                                            | PASS  |
| 3      | `"2026-03-15T00:00:00"` (pre-save)         | `"2026-03-15T00:00:00"`                                          | PASS  |
| 4      | `"2026-03-15T03:00:00.000Z"` (pre-save)    | `"2026-03-15T03:00:00.000Z"`                                     | PASS  |
| 5      | Save succeeds                              | `IsFormSaved: true`, `UnsavedChanges: 0`, DataID: `2c2e9776-...` | PASS  |
| 6      | Reload shows DateTest Rev 1                | `DateTest-000079 Rev 1`                                          | PASS  |
| 8      | `"2026-03-15T00:00:00"` (post-reload)      | `"2026-03-15T00:00:00"`                                          | PASS  |
| 9      | `"2026-03-15T03:00:00.000Z"` (post-reload) | `"2026-03-15T03:00:00.000Z"`                                     | PASS  |
| 10     | `"2026-03-15T03:00:00.000Z"`               | `"2026-03-15T03:00:00.000Z"`                                     | PASS  |

> **Full save-then-reload cycle**: Set value on fresh form (DateTest-000079), saved, then loaded the saved record via DataID URL. Validates complete pipeline on the current template.

## Outcome

**PASS** — Config C DateTime field survives the full save-then-reload cycle. Raw stored value and GFV (correct UTC conversion) are identical pre-save and post-reload.

## Findings

- Full save-then-reload confirmed on current template — no regression from template changes.
- GFV correctly returns `"2026-03-15T03:00:00.000Z"` (proper UTC conversion for `ignoreTimezone=false`) both pre-save and post-reload.
- Raw stored value `"2026-03-15T00:00:00"` (local midnight without Z) preserved through save cycle.
