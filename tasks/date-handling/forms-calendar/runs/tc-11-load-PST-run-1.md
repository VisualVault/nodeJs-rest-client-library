# TC-11-load-PST — Run 1 | 2026-04-08 | PDT | FAIL

**Spec**: [tc-11-load-PST.md](../test-cases/tc-11-load-PST.md) | **Summary**: [summary](../summaries/tc-11-load-PST.md)

## Environment

| Parameter   | Value                                              |
| ----------- | -------------------------------------------------- |
| Date        | 2026-04-08                                         |
| Tester TZ   | America/Los_Angeles — UTC-7 (PDT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)        |
| Platform    | VisualVault FormViewer                             |
| Test Method | Playwright CLI (`timezoneId: America/Los_Angeles`) |
| Record      | DateTest-000080 Rev 2                              |

## Preconditions Verified

| Check        | Command                      | Result                    |
| ------------ | ---------------------------- | ------------------------- |
| TZ           | `new Date().toString()`      | Contains GMT-0700 (PDT) ✓ |
| V1/V2        | useUpdatedCalendarValueLogic | `false` → V1 active ✓     |
| Field lookup | Config D filter              | `["Field5"]` ✓            |
| Record       | DateTest-000080 Rev 2        | Loaded ✓                  |

## Step Results

| Step # | Expected                | Actual                       | Match              |
| ------ | ----------------------- | ---------------------------- | ------------------ |
| 3      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"`      | PASS               |
| 4      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | **FAIL** (fake Z)  |
| 6      | `"2026-03-15T00:00:00"` | `"2026-03-14T17:00:00"`      | **FAIL** (-7h PDT) |
| 9      | `"2026-03-15"`          | `"2026-03-15"`               | PASS               |

## Outcome

**FAIL** — Bug #5 -7h drift (PDT, not -8h PST as matrix predicted). Raw preserved on load; round-trip drifts. Config A date-only preserved.

## Findings

- Matrix predicted -8h (PST) but actual is -7h (PDT) — DST active for Mar 15 2026
- Matrix prediction should be corrected: -7h/trip (PDT) not -8h (PST)
- Raw value preserved on cross-TZ load (consistent with all other Cat 11 load tests)
- Extends Bug #5 TZ spectrum: BRT -3h, PDT -7h, PST -8h (DST day), IST +5:30h, UTC0 0h
- Config A date-only: PASS (preserved, no FORM-BUG-7 on load)
