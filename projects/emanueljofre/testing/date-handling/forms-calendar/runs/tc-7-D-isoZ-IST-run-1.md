# TC-7-D-isoZ-IST — Run 1 | 2026-04-01 | IST | FAIL

**Spec**: [tc-7-D-isoZ-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-7-D-isoZ-IST.md) | **Summary**: [summary](../summaries/tc-7-D-isoZ-IST.md)

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

| Step # | Expected                                        | Actual                                                       | Match    |
| ------ | ----------------------------------------------- | ------------------------------------------------------------ | -------- |
| 1      | SFV("2026-03-15T00:00:00.000Z") accepted        | Input accepted                                               | PASS     |
| 2      | raw = `"2026-03-15T00:00:00"` (midnight stored) | raw = `"2026-03-15T05:30:00"` (+5:30h shift!)                | **FAIL** |
| 3      | GFV = `"2026-03-15T00:00:00.000Z"`              | api = `"2026-03-15T05:30:00.000Z"` (fake Z on shifted value) | **FAIL** |

## Outcome

**FAIL** — ISO+Z input shifted by TZ offset. UTC midnight (`T00:00:00.000Z`) was interpreted as IST, resulting in storage as `T05:30:00` (UTC midnight + 5:30h IST offset).

## Findings

- **ISO+Z input is unsafe for Config D**: `normalizeCalValue()` parses `"2026-03-15T00:00:00.000Z"` as a Date object (UTC midnight). `getSaveValue()` then extracts the **local** time components (IST = UTC+5:30), storing `"2026-03-15T05:30:00"` — 5:30 AM instead of midnight.
- **Shift direction matches TZ offset**: +5:30h for IST. In BRT (UTC-3), the same input would shift -3h (storing previous day 21:00). The Z suffix causes `new Date()` to parse as UTC, but `getSaveValue()` always extracts local time.
- **GFV compounds the error**: The already-shifted value gets the fake Z appended: `"2026-03-15T05:30:00.000Z"`. A subsequent round-trip would shift again by +5:30h.
- **Developer guidance**: Never pass ISO strings with Z suffix to SetFieldValue on Config D fields. Use ISO without Z (`"2026-03-15T00:00:00"`) or Date objects (`new Date(2026,2,15)`) instead.
