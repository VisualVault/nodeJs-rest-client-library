# TC-7-D-isoNoZ-IST — Run 1 | 2026-04-01 | IST | PASS

**Spec**: [tc-7-D-isoNoZ-IST.md](../test-cases/tc-7-D-isoNoZ-IST.md) | **Summary**: [summary](../summaries/tc-7-D-isoNoZ-IST.md)

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

| Step # | Expected                                    | Actual                             | Match |
| ------ | ------------------------------------------- | ---------------------------------- | ----- |
| 1      | SFV("2026-03-15T00:00:00") accepted         | Input accepted                     | PASS  |
| 2      | raw = `"2026-03-15T00:00:00"` (unchanged)   | raw = `"2026-03-15T00:00:00"`      | PASS  |
| 3      | GFV = `"2026-03-15T00:00:00.000Z"` (fake Z) | api = `"2026-03-15T00:00:00.000Z"` | PASS  |

## Outcome

**PASS** — ISO without Z treated as local time, stored correctly. The input `"2026-03-15T00:00:00"` is parsed as local midnight (IST), which `getSaveValue()` stores as `"2026-03-15T00:00:00"` — no shift.

## Findings

- **ISO-no-Z is the recommended input format**: Without the Z suffix, `normalizeCalValue()` parses the string as local time via `moment()`. `getSaveValue()` extracts local components, producing the same value. Zero shift.
- **Consistent across timezones**: This matches the behavior in BRT and UTC+0 — ISO-no-Z is universally safe for Config D DateTime fields.
- **GFV still appends fake Z**: The stored value is correct, but GFV returns `"2026-03-15T00:00:00.000Z"` (Bug #5). This is expected and does not corrupt the stored value — only the output.
- **Input format summary for Config D in IST**: ISO-no-Z (PASS), Date object (PASS), ISO+Z (FAIL). The Z suffix is the differentiator.
