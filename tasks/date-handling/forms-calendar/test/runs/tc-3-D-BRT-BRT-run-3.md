# TC-3-D-BRT-BRT — Run 3 | 2026-03-31 | BRT | PASS (FAIL-3 — Bug #5 active)

**Spec**: [tc-3-D-BRT-BRT.md](../tc-3-D-BRT-BRT.md) | **Summary**: [summary](../summaries/tc-3-D-BRT-BRT.md)

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
| Field lookup | filter snippet                                              | `["DataField5"]` ✓                                                                   |

## Step Results

| Step # | Expected                                  | Actual                                                           | Match    |
| ------ | ----------------------------------------- | ---------------------------------------------------------------- | -------- |
| 2      | Display `03/15/2026 12:00 AM`             | `03/15/2026 12:00 AM`                                            | PASS     |
| 3      | `"2026-03-15T00:00:00"` (pre-save)        | `"2026-03-15T00:00:00"`                                          | PASS     |
| 4      | `"2026-03-15T00:00:00"` (pre-save GFV)    | `"2026-03-15T00:00:00.000Z"`                                     | **FAIL** |
| 5      | Save succeeds                             | `IsFormSaved: true`, `UnsavedChanges: 0`, DataID: `2c2e9776-...` | PASS     |
| 6      | Reload shows DateTest Rev 1               | `DateTest-000079 Rev 1`                                          | PASS     |
| 8      | `"2026-03-15T00:00:00"` (post-reload)     | `"2026-03-15T00:00:00"`                                          | PASS     |
| 9      | `"2026-03-15T00:00:00"` (post-reload GFV) | `"2026-03-15T00:00:00.000Z"`                                     | **FAIL** |
| 10     | `"2026-03-15T03:00:00.000Z"`              | `"2026-03-15T03:00:00.000Z"`                                     | PASS     |

> **Full save-then-reload cycle**: Set value on fresh form (DateTest-000079), saved, then loaded the saved record via DataID URL. Steps 4 and 9 both FAIL with FAIL-3 (Bug #5 fake Z) — the bug is present both pre-save and post-reload, confirming it's a GFV-layer issue, not a reload-specific issue.

## Outcome

**PASS (with FAIL-3)** — Config D raw stored value survives the full save-then-reload cycle unchanged. Bug #5 (fake Z in GFV) is active both before save and after reload — the reload path introduces no additional transformation. Matrix status remains PASS.

## Findings

- Full save-then-reload confirmed on current template — no regression from template changes.
- Raw stored value `"2026-03-15T00:00:00"` preserved through save cycle — save does not corrupt Config D values.
- Bug #5 confirmed active in BOTH pre-save and post-reload GFV calls. This means the fake Z is a persistent GFV-layer defect, not something introduced by save or reload.
- Pre-save GFV = post-reload GFV = `"2026-03-15T00:00:00.000Z"` — consistent (buggy) behavior.
- Contradicts Run 1 (2026-03-27) which reported clean GFV. Run 1 may have had different observation conditions.
