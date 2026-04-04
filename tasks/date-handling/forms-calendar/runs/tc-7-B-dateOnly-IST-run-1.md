# TC-7-B-dateOnly-IST — Run 1 | 2026-04-03 | IST | FAIL-1

**Spec**: [tc-7-B-dateOnly-IST.md](../test-cases/tc-7-B-dateOnly-IST.md) | **Summary**: [summary](../summaries/tc-7-B-dateOnly-IST.md)

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
| raw    | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| api    | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| isoRef | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Bug #7 confirmed for Config B in IST. Date string `"2026-03-15"` stores `"2026-03-14"` (-1 day). `ignoreTZ=true` does not protect date-only fields.

## Findings

- Bug #7 confirmed: `moment("2026-03-15").toDate()` in IST → IST midnight March 15 = UTC March 14 18:30 → `getSaveValue()` extracts UTC date `"2026-03-14"`.
- Identical to Config A dateOnly-IST — `ignoreTimezone` flag has zero effect on the Bug #7 code path for date-only fields.
- This confirms the matrix prediction was correct.
