# TC-13-cross-tz-save — Run 1 | 2026-04-08 | BRT+IST | FAIL

**Spec**: [tc-13-cross-tz-save.md](tasks/date-handling/forms-calendar/test-cases/tc-13-cross-tz-save.md) | **Summary**: [summary](../summaries/tc-13-cross-tz-save.md)

## Environment

| Parameter   | Value                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| Date        | 2026-04-08                                                                    |
| Tester TZ   | N/A — API read of records previously saved from BRT (000080) and IST (000084) |
| Code path   | N/A — REST API verification                                                   |
| Platform    | VisualVault REST API (getForms)                                               |
| Test Method | `run-ws-test.js --action WS-2` for both records                               |

## Preconditions Verified

| Check      | Command                                                   | Result                           |
| ---------- | --------------------------------------------------------- | -------------------------------- |
| API auth   | `run-ws-test.js` authentication                           | `acquireSecurityToken Success` ✓ |
| BRT record | `--action WS-2 --record-id DateTest-000080 --configs A,D` | Both fields non-null ✓           |
| IST record | `--action WS-2 --record-id DateTest-000084 --configs A,D` | Both fields non-null ✓           |

## Step Results

| Step # | Expected                 | Actual                       | Match    |
| ------ | ------------------------ | ---------------------------- | -------- |
| 2      | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"`     | PASS     |
| 3      | `"2026-03-15T00:00:00Z"` | `"2026-03-14T00:00:00Z"`     | **FAIL** |
| 4      | BRT = IST                | BRT ≠ IST (Mar 15 vs Mar 14) | **FAIL** |
| 5      | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"`     | PASS     |
| 6      | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"`     | PASS     |
| 7      | BRT = IST                | BRT = IST (both T00:00:00Z)  | PASS     |

## Outcome

**FAIL** — FORM-BUG-7 causes date-only Config A to store March 14 when saved from IST instead of March 15. Config D (DateTime+ignoreTZ) is immune — stores identically from both TZs.

## Findings

- **Config A divergence confirmed**: BRT stores `"2026-03-15T00:00:00Z"`, IST stores `"2026-03-14T00:00:00Z"` for the same user selection of March 15, 2026. This is FORM-BUG-7 visible at the database level.
- **Config D immune**: Both TZs store `"2026-03-15T00:00:00Z"` — the `ignoreTimezone=true` + `enableTime=true` combination stores local midnight without UTC conversion, making it TZ-independent.
- **Preset fields also affected**: BRT preset (field2) = `"2026-03-01T03:00:00Z"` (midnight BRT = 03:00 UTC); IST preset (field2) = `"2026-02-28T18:30:00Z"` (midnight IST = 18:30 UTC previous day). Different UTC representations of "midnight March 1" depending on TZ.
- **Matrix prediction correction**: Expected `"2026-03-14T18:30:00"` (DateTime UTC equivalent). Actual: `"2026-03-14T00:00:00Z"` (date-only field stores midnight on wrong day via BUG-7, not UTC equivalent of IST midnight). Prediction was directionally correct (different value) but mechanism differs.
