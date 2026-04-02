# TC-7-D-dateObj-IST — Run 1 | 2026-04-01 | IST | PASS

**Spec**: [tc-7-D-dateObj-IST.md](../test-cases/tc-7-D-dateObj-IST.md) | **Summary**: [summary](../summaries/tc-7-D-dateObj-IST.md)

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

| Step # | Expected                                                           | Actual                             | Match |
| ------ | ------------------------------------------------------------------ | ---------------------------------- | ----- |
| 1      | SFV(new Date(2026,2,15)) — IST midnight = 2026-03-14T18:30:00.000Z | Input accepted                     | PASS  |
| 2      | raw = `"2026-03-15T00:00:00"` (correct local midnight)             | raw = `"2026-03-15T00:00:00"`      | PASS  |
| 3      | GFV = `"2026-03-15T00:00:00.000Z"` (fake Z)                        | api = `"2026-03-15T00:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Date object input is safe for Config D DateTime in IST. No double-shift. `new Date(2026,2,15)` creates IST midnight (UTC 2026-03-14T18:30:00.000Z), which `normalizeCalValue()` correctly stores as local midnight `"2026-03-15T00:00:00"`.

## Findings

- **No double-shift for Date objects**: Unlike date-only fields (Bug #7), Config D DateTime fields handle Date object input correctly. `normalizeCalValue()` processes the Date → `getSaveValue()` extracts local time components → stores `"2026-03-15T00:00:00"`.
- **GFV still has fake Z**: The stored value is correct, but GFV returns `"2026-03-15T00:00:00.000Z"` (Bug #5 fake Z). This is expected and consistent with all other Config D tests.
- **Date object is a safe input format for Config D**: Combined with ISO-no-Z (tc-7-D-isoNoZ-IST), Date objects and ISO strings without Z are both safe. ISO+Z is the only unsafe format (tc-7-D-isoZ-IST).
