# TC-8-D-UTC0 — Run 1 | 2026-04-03 | UTC0 | FAIL

**Spec**: [tc-8-D-UTC0.md](tasks/date-handling/forms-calendar/test-cases/tc-8-D-UTC0.md) | **Summary**: [summary](../summaries/tc-8-D-UTC0.md)

## Environment

| Parameter   | Value                                       |
| ----------- | ------------------------------------------- |
| Date        | 2026-04-03                                  |
| Browser     | Chromium (Playwright headless)              |
| Tester TZ   | Etc/GMT — UTC+0                             |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform    | VisualVault FormViewer                      |
| Test Method | Playwright CLI (`timezoneId: Etc/GMT`)      |

## Preconditions Verified

| Check        | Command                                                                                | Result                                             |
| ------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                | `"...GMT+0000 (Greenwich Mean Time)"` — GMT+0000 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                            | `false` → V1 active ✓                              |
| Field lookup | filter enableTime=true, ignoreTimezone=true, useLegacy=false, enableInitialValue=false | `["Field5"]` ✓                                     |

## Step Results

| Step # | Expected                | Actual                       | Match    |
| ------ | ----------------------- | ---------------------------- | -------- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"`      | PASS     |
| api    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | **FAIL** |

## Outcome

**FAIL-1** — Bug #5 fake Z confirmed at UTC+0. GFV returns `"2026-03-15T00:00:00.000Z"` (fake Z appended) instead of raw `"2026-03-15T00:00:00"`. At UTC+0, the fake Z is coincidentally numerically correct but structurally wrong.

## Findings

- Bug #5 is structurally present at UTC+0, but the 0h offset makes it invisible in round-trip drift calculations
- `SetFieldValue(GetFieldValue(field))` would produce 0h drift per trip at UTC+0 (no practical impact)
- Completes Config D 3-TZ spectrum: BRT (-3h drift/trip), IST (+5:30h drift/trip), UTC0 (0h drift — invisible)
- The invisible manifestation at UTC+0 is why Bug #5 may go unnoticed in UTC+0 testing environments
- Matrix prediction was correct: "fake Z, coincidentally correct at UTC+0"
