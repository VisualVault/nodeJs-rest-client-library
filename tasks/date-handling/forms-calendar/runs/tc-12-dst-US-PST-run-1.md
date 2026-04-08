# TC-12-dst-US-PST — Run 1 | 2026-04-08 | PDT | FAIL

**Spec**: [tc-12-dst-US-PST.md](../test-cases/tc-12-dst-US-PST.md) | **Summary**: [summary](../summaries/tc-12-dst-US-PST.md)

## Environment

| Parameter   | Value                                              |
| ----------- | -------------------------------------------------- |
| Date        | 2026-04-08                                         |
| Tester TZ   | America/Los_Angeles — UTC-7 (PDT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)        |
| Platform    | VisualVault FormViewer                             |
| Test Method | Playwright CLI (`timezoneId: America/Los_Angeles`) |

## Preconditions Verified

| Check        | Command                      | Result                                                                              |
| ------------ | ---------------------------- | ----------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`      | `"Wed Apr 08 2026 13:02:15 GMT-0700 (Pacific Daylight Time)"` — contains GMT-0700 ✓ |
| V1/V2        | useUpdatedCalendarValueLogic | `false` → V1 active ✓                                                               |
| Field lookup | Config D filter              | `["Field5"]` ✓                                                                      |

## Step Results

| Step # | Expected                | Actual                       | Match                         |
| ------ | ----------------------- | ---------------------------- | ----------------------------- |
| 3      | `"2026-03-08T02:00:00"` | `"2026-03-08T03:00:00"`      | **FAIL** (DST 2AM→3AM)        |
| 4      | `"2026-03-08T02:00:00"` | `"2026-03-08T03:00:00.000Z"` | **FAIL** (fake Z + DST)       |
| 6      | `"2026-03-08T02:00:00"` | `"2026-03-07T19:00:00"`      | **FAIL** (day + DST boundary) |

## Outcome

**FAIL** — DST spring-forward + Bug #5 compound. V8 advances 2AM→3AM. Fake Z `"T03:00:00.000Z"` → UTC Mar 8 03:00 = PST Mar 7 19:00 (pre-DST window, UTC-8). Day crossed backwards + DST boundary crossed.

## Findings

- DST spring-forward creates extra complexity: non-existent 2AM resolved to 3AM PDT
- Bug #5 round-trip crosses both day AND DST boundaries: Mar 8 3AM PDT → Mar 7 7PM PST
- The -8h drift occurs because UTC 03:00 on Mar 8 falls in the pre-DST window (before 10:00 UTC when DST starts)
- This is worse than a standard -7h PDT drift — the DST transition causes the fake Z to land in the PST zone
- JS ref: `new Date(2026, 2, 8, 2, 0, 0).toString()` → `"Sun Mar 08 2026 03:00:00 GMT-0700"` confirms V8 DST handling
