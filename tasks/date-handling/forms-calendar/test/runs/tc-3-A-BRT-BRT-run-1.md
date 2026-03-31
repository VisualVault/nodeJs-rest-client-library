# TC-3-A-BRT-BRT — Run 1 | 2026-03-27 | BRT | PASS

**Spec**: [tc-2-1-form-load-brt.md](../tc-2-1-form-load-brt.md) | **Summary**: [summary](../summaries/tc-3-A-BRT-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-27                                  |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (pre-2026-04-01).

## Step Results

| Step # | Expected                                                                                   | Actual                                  | Match |
| ------ | ------------------------------------------------------------------------------------------ | --------------------------------------- | ----- |
| 1      | All P1–P6 checks pass                                                                      | All P1–P6 checks pass                   | PASS  |
| 2      | Tab title `DateTest-000004 Rev 1`; initial-value fields visible                            | Tab title and indicator confirmed       | PASS  |
| 3      | `["DataField1: string", "DataField2: string", "DataField3: string", "DataField4: string"]` | All four fields returned `string` type  | PASS  |
| 4      | DataField1 display: `03/27/2026`; DataField3 display: `03/27/2026`                         | `03/27/2026` both                       | PASS  |
| 5      | DataField2 display: `03/01/2026`; DataField4 display: `03/01/2026`                         | `03/01/2026` both                       | PASS  |
| 6      | GFV DataField1: `Date.toString()` format, date portion `03/27/2026`                        | Correct Date.toString() format returned | PASS  |
| 7      | GFV DataField2: `Date.toString()` format, date `03/01/2026`                                | Correct Date.toString() format returned | PASS  |
| 8      | Display: Current Date fields `03/27/2026`; Preset fields `03/01/2026`                      | All four correct                        | PASS  |
| 9      | `"2026-03-27T03:00:00.000Z"` (BRT confirmed)                                               | `"2026-03-27T03:00:00.000Z"`            | PASS  |

> Note: This is a BRT-saved → BRT-reload test (server reload path). Config A (`enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`) with `enableInitialValue=true`. After server save/reload, initial-value fields are returned as strings (`"MM/dd/yyyy HH:mm:ss"` format) rather than Date objects. Display is unaffected — the date portion is preserved correctly. No drift on reload.

## Outcome

**PASS** — Config A initial-value fields display identically on server reload in BRT; raw stored type changes from Date object to string, but date values are correct and display is unchanged.

## Findings

- After save/reload, `getValueObjectValue()` returns a string in `"MM/dd/yyyy HH:mm:ss"` format — the Date object present before save is replaced by the server-returned string.
- Display and GFV date portions are correct — no day shift across the save/reload cycle.
- Config A is outside the Bug #5 surface (`enableTime=false`), so no fake-Z risk on reload.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
