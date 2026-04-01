# TC-5-A-IST — Run 1 | 2026-04-01 | IST | FAIL-3

**Spec**: [tc-5-A-IST.md](../test-cases/tc-5-A-IST.md) | **Summary**: [summary](../summaries/tc-5-A-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-01                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer, Build 20260304.1     |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                            |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Wed Apr 01 2026 21:14:18 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | Config A preset filter                                      | DataField2 with `initialDate: "2026-03-01T03:00:00Z"` ✓                           |

## Step Results

| Step # | Expected                                    | Actual                                              | Match    |
| ------ | ------------------------------------------- | --------------------------------------------------- | -------- |
| 2      | Display: `03/01/2026`                       | `03/01/2026` (visible on form)                      | PASS     |
| 3      | Date ISO contains `"2026-03-01"`            | Date ISO: `"2026-02-28T18:30:00.000Z"` (Feb 28 UTC) | **FAIL** |
| 3      | Date `.toLocaleDateString()` = `"3/1/2026"` | `"3/1/2026"` (correct local)                        | PASS     |
| 4      | GFV = `"2026-03-01"` (string)               | Date object: `"2026-02-28T18:30:00.000Z"`           | **FAIL** |
| 5      | Simulated save = `"2026-03-01"`             | `"2026-02-28"` (extracted from UTC Date)            | **FAIL** |
| 6      | `"2026-02-28T18:30:00.000Z"` — IST active   | `"2026-02-28T18:30:00.000Z"`                        | PASS     |

## Outcome

**FAIL-3** — Bug #7 confirmed on preset/form-init path in IST. The preset Date object has the wrong UTC date (Feb 28 instead of Mar 1). Display shows the correct local date (`03/01/2026`), masking the bug. Saving would permanently store `"2026-02-28"`.

## Findings

- **Matrix prediction confirmed**: The matrix predicted `"2026-02-28"` (Bug #7 -1 day). The simulated save value matches. The raw value is a Date object (not a string), but the UTC date portion confirms the prediction.
- **Bug #7 confirmed on preset/form-init path**: This is a MAJOR scope expansion. Bug #7 was previously confirmed only on `SetFieldValue()` (Cat 1, 2, 7) and baked into IST-saved records (Cat 3). Now confirmed on the form initialization path — `initCalendarValueV1()` constructs the preset Date via `moment("2026-03-01").toDate()` → IST midnight → wrong UTC day.
- **Display masks the bug**: The Date object's `.toLocaleDateString()` shows `"3/1/2026"` (correct). The user sees the right date but the internal UTC representation is wrong. The corruption only becomes visible on save, or if any code calls `.toISOString()`.
- **GFV returns Date object (not string)**: For preset fields before save, `GetFieldValue()` returns the raw Date object, not a date-only string. This means developer code calling `GetFieldValue()` on a preset field gets a Date, not a string — inconsistent with post-save behavior (which returns a string).
- **3-A-BRT-IST mystery resolved**: 3-A-BRT-IST PASSED because saved records come from the server as **strings** (e.g., `"2026-03-15"`), not Date objects. The form load path for saved data preserves the string. The PRESET path constructs a NEW Date object via `moment(e).toDate()` — that's where Bug #7 fires. Two different init sub-paths: saved-data (string, safe) vs preset (Date construction, buggy).
- **Sibling implications**: 5-B-IST will produce identical results (`ignoreTZ` inert for date-only). 5-E-IST and 5-F-IST (legacy presets) likely have the same bug via the same `moment().toDate()` path.
- **Recommended next action**: Run 8-A-empty (Bug #6 scope) or 8B-D-BRT (GDOC API test) to continue closing assessment gaps.
