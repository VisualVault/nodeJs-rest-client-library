# TC-8B-D-IST — Run 1 | 2026-04-01 | IST | PASS

**Spec**: [tc-8B-D-IST.md](../test-cases/tc-8B-D-IST.md) | **Summary**: [summary](../summaries/tc-8B-D-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-01                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                     | Result                |
| ------------ | ----------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                     | Contains GMT+0530 ✓   |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓ |
| Field lookup | filter by config flags                                      | `["DataField5"]` ✓    |

## Step Results

| Step # | Expected                                          | Actual                                                                        | Match |
| ------ | ------------------------------------------------- | ----------------------------------------------------------------------------- | ----- |
| 1      | SFV sets raw to `"2026-03-15T00:00:00"`           | raw = `"2026-03-15T00:00:00"`                                                 | PASS  |
| 2      | GDOC returns Date object                          | GDOC.toString() = `"Sun Mar 15 2026 00:00:00 GMT+0530 (India Standard Time)"` | PASS  |
| 3      | GDOC.toISOString() = `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"`                                                  | PASS  |
| 4      | GFV returns fake-Z value                          | `"2026-03-15T00:00:00.000Z"` (fake Z for comparison)                          | PASS  |

## Outcome

**PASS** — GetDateObjectFromCalendar returns a correct Date object for Config D in IST. The Date represents IST midnight (00:00 +0530), and toISOString() produces genuine UTC (`2026-03-14T18:30:00.000Z` = IST midnight minus 5:30h = previous UTC day).

## Findings

- **GDOC behavior matches BRT pattern**: In BRT, GDOC.toISOString() was `T03:00:00.000Z` (midnight + 3h). In IST, it is `T18:30:00.000Z` on the previous day (midnight - 5:30h expressed as UTC). Both are correct real UTC conversions.
- **GFV comparison confirms Bug #5**: GFV returns `"2026-03-15T00:00:00.000Z"` (fake Z — local midnight mislabeled as UTC), while GDOC.toISOString() returns `"2026-03-14T18:30:00.000Z"` (real UTC). The 5:30h gap proves the fake Z.
- **Key developer implication for IST**: A developer using `GDOC().toISOString()` gets correct UTC (previous day 18:30Z). Using `GetFieldValue()` gets wrong UTC (same day 00:00Z). The discrepancy is 5h30m — larger than BRT's 3h.
- UTC+ timezone confirmed: IST midnight maps to previous UTC day, as predicted by matrix
