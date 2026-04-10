# TC-11-roundtrip-cross — Run 1 | 2026-04-08 | IST+BRT | FAIL

**Spec**: [tc-11-roundtrip-cross.md](tasks/date-handling/forms-calendar/test-cases/tc-11-roundtrip-cross.md) | **Summary**: [summary](../summaries/tc-11-roundtrip-cross.md)

## Environment

| Parameter | Value                                                                                       |
| --------- | ------------------------------------------------------------------------------------------- |
| Date      | 2026-04-08                                                                                  |
| Tester TZ | Multi-TZ: Phase A = Asia/Calcutta (IST, UTC+5:30); Phase B = America/Sao_Paulo (BRT, UTC-3) |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`)                                                 |
| Platform  | VisualVault FormViewer                                                                      |

## Preconditions Verified

**Phase A (IST):**

| Check        | Command                                                     | Result                |
| ------------ | ----------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                     | Contains GMT+0530 ✓   |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓ |
| Field lookup | Config D filter                                             | `["Field5"]` ✓        |

**Phase B (BRT):**

| Check        | Command                                                     | Result                |
| ------------ | ----------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                     | Contains GMT-0300 ✓   |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓ |
| Field lookup | Config D filter                                             | `["Field5"]` ✓        |

## Step Results

| Step # | Expected                | Actual                       | Match                 |
| ------ | ----------------------- | ---------------------------- | --------------------- |
| 2      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"`      | PASS                  |
| 3      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | **FAIL** (fake Z)     |
| 5      | `"2026-03-15T00:00:00"` | `"2026-03-15T05:30:00"`      | **FAIL** (+5:30h)     |
| 9      | `"2026-03-15T00:00:00"` | `"2026-03-15T05:30:00"`      | **FAIL**              |
| 10     | `"2026-03-15T00:00:00"` | `"2026-03-15T05:30:00.000Z"` | **FAIL** (fake Z)     |
| 12     | `"2026-03-15T00:00:00"` | `"2026-03-15T02:30:00"`      | **FAIL** (+2:30h net) |

## Outcome

**FAIL** — Compound Bug #5 drift across TZ boundaries. IST round-trip shifts +5:30h, BRT round-trip then shifts -3h, netting +2:30h from original midnight. Each TZ user independently applies their offset via the fake Z mechanism.

## Findings

- Compound drift confirmed: IST +5:30h + BRT -3h = +2:30h net
- Drift is additive across TZ boundaries — each user's round-trip applies their own offset
- This is the worst-case Bug #5 scenario: data silently corrupts as different TZ users interact with the same record
- The value `"2026-03-15T02:30:00"` would display as "02:30 AM" — the user intended midnight
- Without server save, this simulates the minimum 2-user corruption path
- Workaround: use `useLegacy=true` (Config H) or GDOC instead of GFV for round-trips
