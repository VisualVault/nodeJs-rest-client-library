# TC-2-D-IST — Run 1 | 2026-03-31 | IST | FAIL-1

**Spec**: [tc-2-D-IST.md](../test-cases/tc-2-D-IST.md) | **Summary**: [summary](../summaries/tc-2-D-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | Asia/Calcutta — UTC+5:30 (IST)              |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                            |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 23:01:48 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | filter snippet                                              | `["DataField5"]` ✓                                                                |

## Step Results

| Step # | Expected                         | Actual                       | Match    |
| ------ | -------------------------------- | ---------------------------- | -------- |
| 9      | Display: `"03/15/2026 12:00 AM"` | `"03/15/2026 12:00 AM"`      | PASS     |
| 10     | `"2026-03-15T00:00:00"`          | `"2026-03-15T00:00:00"`      | PASS     |
| 11     | `"2026-03-15T00:00:00"`          | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| 12     | `"2026-03-14T18:30:00.000Z"`     | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Bug #5 confirmed: `GetFieldValue()` appends fake `.000Z` to local midnight value. Raw storage is correct (`"2026-03-15T00:00:00"`); the bug is in the output transformation layer (`getCalendarFieldValue()`).

## Findings

- Raw storage matches corrected matrix prediction `"2026-03-15T00:00:00"` — local midnight, identical to 2-C-IST and 1-D-IST
- Bug #5 confirmed in IST typed input — same behavior as popup (1-D-IST): fake Z appended to GFV return
- Bug #6 also observed: before typing, `GetFieldValue('DataField5')` returned `"Invalid Date"` for the empty field
- Bug #2 absent — typed input produces identical raw storage to popup (1-D-IST: `"2026-03-15T00:00:00"`)
- Round-trip drift: `SetFieldValue(GetFieldValue())` would shift +5:30h per trip in IST due to fake Z re-parsed as UTC
- Original matrix prediction `"2026-03-14T18:30:00"` was corrected to `"2026-03-15T00:00:00"` (done in 2-C-IST session)
