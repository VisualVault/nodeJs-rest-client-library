# TC-7-B-dateObj-IST — Run 1 | 2026-04-03 | IST | FAIL-1

**Spec**: [tc-7-B-dateObj-IST.md](../test-cases/tc-7-B-dateObj-IST.md) | **Summary**: [summary](../summaries/tc-7-B-dateObj-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-03                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                            |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Sat Apr 04 2026 04:36:06 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | filter snippet                                              | `["Field10"]` ✓                                                                   |

## Step Results

| Step # | Expected                     | Actual                       | Match    |
| ------ | ---------------------------- | ---------------------------- | -------- |
| raw    | `"2026-03-15"`               | `"2026-03-13"`               | **FAIL** |
| api    | `"2026-03-15"`               | `"2026-03-13"`               | **FAIL** |
| isoRef | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Bug #7 double-shift confirmed for Config B Date object in IST. `new Date(2026, 2, 15)` stores `"2026-03-13"` (-2 days).

## Findings

- Bug #7 double-shift confirmed: `Date→toISOString()→strip Z→reparse as local`. Two TZ boundary crossings in IST = -2 days.
- Identical to Config A dateObj-IST — `ignoreTimezone=true` does not protect date-only fields from Bug #7.
- This confirms the matrix prediction was correct.
- The double-shift is unique to Date object input; string input (`7-B-dateOnly-IST`) shows only -1 day.
