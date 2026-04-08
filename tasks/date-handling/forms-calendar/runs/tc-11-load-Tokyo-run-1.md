# TC-11-load-Tokyo — Run 1 | 2026-04-08 | JST | FAIL

**Spec**: [tc-11-load-Tokyo.md](../test-cases/tc-11-load-Tokyo.md) | **Summary**: [summary](../summaries/tc-11-load-Tokyo.md)

## Environment

| Parameter   | Value                                       |
| ----------- | ------------------------------------------- |
| Date        | 2026-04-08                                  |
| Tester TZ   | Asia/Tokyo — UTC+9 (JST)                    |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform    | VisualVault FormViewer                      |
| Test Method | Playwright CLI (`timezoneId: Asia/Tokyo`)   |

## Preconditions Verified

| Check  | Command                      | Result                                                                   |
| ------ | ---------------------------- | ------------------------------------------------------------------------ |
| TZ     | `new Date().toString()`      | `"Thu Apr 09 2026 05:09:44 GMT+0900 (Japan Standard Time)"` — GMT+0900 ✓ |
| V1/V2  | useUpdatedCalendarValueLogic | `false` → V1 active ✓                                                    |
| Field  | Config D filter              | `["Field5"]` ✓                                                           |
| Record | DateTest-000080 Rev 2        | Loaded ✓                                                                 |

## Step Results

| Step # | Expected                | Actual                       | Match             |
| ------ | ----------------------- | ---------------------------- | ----------------- |
| 3      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"`      | PASS              |
| 4      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | **FAIL** (fake Z) |
| 6      | `"2026-03-15T00:00:00"` | `"2026-03-15T09:00:00"`      | **FAIL** (+9h)    |
| 8      | `"2026-03-15"`          | `"2026-03-15"`               | PASS              |

## Outcome

**FAIL** — Bug #5 +9h drift (JST). Raw preserved on load; round-trip drifts +9h. Largest positive drift tested. Config A date-only preserved.

## Findings

- Matrix prediction of +9h confirmed exactly
- Raw value preserved on cross-TZ load (consistent with all Cat 11 load tests)
- +9h is the largest positive drift tested — JST midnight + 9h = 9:00 AM same day (stays same calendar day for 1 trip)
- After 3 trips: +27h total → crosses to next day. After ~2.67 trips: full day forward
- Completes Bug #5 TZ spectrum: BRT -3h, PDT -7h, PST -8h (DST), UTC0 0h, IST +5:30h, JST +9h
- Config A: PASS (date-only preserved, no FORM-BUG-7 on load — consistent with all Cat 11 tests)
