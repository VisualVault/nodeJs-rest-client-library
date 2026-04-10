# TC-11-D-concurrent-IST-edit — Run 1 | 2026-04-08 | IST+BRT | FAIL

**Spec**: [tc-11-D-concurrent-IST-edit.md](tasks/date-handling/forms-calendar/test-cases/tc-11-D-concurrent-IST-edit.md) | **Summary**: [summary](../summaries/tc-11-D-concurrent-IST-edit.md)

## Environment

| Parameter | Value                                                                                       |
| --------- | ------------------------------------------------------------------------------------------- |
| Date      | 2026-04-08                                                                                  |
| Tester TZ | Multi-TZ: Phase A = Asia/Calcutta (IST, UTC+5:30); Phase B = America/Sao_Paulo (BRT, UTC-3) |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`)                                                 |
| Platform  | VisualVault FormViewer                                                                      |

## Preconditions Verified

**Phase A (IST — User A):**

| Check        | Command                                                     | Result                |
| ------------ | ----------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                     | Contains GMT+0530 ✓   |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓ |
| Field lookup | Config D filter                                             | `["Field5"]` ✓        |

**Phase B (BRT — User B):**

| Check        | Command                                                     | Result                |
| ------------ | ----------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                     | Contains GMT-0300 ✓   |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓ |
| Field lookup | Config D filter                                             | `["Field5"]` ✓        |

## Step Results

| Step # | Expected                | Actual                       | Match                 |
| ------ | ----------------------- | ---------------------------- | --------------------- |
| 3      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"`      | PASS                  |
| 4      | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | **FAIL** (fake Z)     |
| 6      | `"2026-03-15T00:00:00"` | `"2026-03-15T05:30:00"`      | **FAIL** (+5:30h)     |
| 10     | `"2026-03-15T00:00:00"` | `"2026-03-15T05:30:00"`      | **FAIL**              |
| 11     | `"2026-03-15T00:00:00"` | `"2026-03-15T05:30:00.000Z"` | **FAIL** (fake Z)     |
| 13     | `"2026-03-15T00:00:00"` | `"2026-03-15T02:30:00"`      | **FAIL** (+2:30h net) |

## Outcome

**FAIL** — Same compound drift as `tc-11-roundtrip-cross`. User A (IST) applies +5:30h via Bug #5 fake Z. User B (BRT) applies -3h to the already-drifted value. Net +2:30h from original midnight.

## Findings

- Concurrent multi-user edit produces same compound drift as sequential cross-TZ round-trip
- Neither user is aware the other's timezone contributes to corruption
- The fake Z in GFV makes each user's round-trip apply their own TZ offset to the value
- In production: IST helpdesk sets a date → BRT admin reviews and updates → date silently shifts +2:30h
- This demonstrates why Bug #5 is classified HIGH SEVERITY — it compounds across users
