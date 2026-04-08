# TC-13-preset-vs-user-input — Run 1 | 2026-04-08 | BRT+IST | FAIL

**Spec**: [tc-13-preset-vs-user-input.md](../test-cases/tc-13-preset-vs-user-input.md) | **Summary**: [summary](../summaries/tc-13-preset-vs-user-input.md)

## Environment

| Parameter   | Value                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| Date        | 2026-04-08                                                                    |
| Tester TZ   | N/A — API read of records previously saved from BRT (000080) and IST (000084) |
| Code path   | N/A — REST API verification                                                   |
| Platform    | VisualVault REST API (getForms)                                               |
| Test Method | `run-ws-test.js --action WS-2` with `--debug` for rawRecord access            |

## Preconditions Verified

| Check      | Command                                                                       | Result                           |
| ---------- | ----------------------------------------------------------------------------- | -------------------------------- |
| API auth   | `run-ws-test.js` authentication                                               | `acquireSecurityToken Success` ✓ |
| BRT record | `--action WS-2 --record-id DateTest-000080 --configs A,B,C,D,E,F,G,H --debug` | rawRecord with all fields ✓      |
| IST record | `--action WS-2 --record-id DateTest-000084 --configs A,B,C,D,E,F,G,H --debug` | rawRecord with all fields ✓      |

## Step Results

| Step # | Expected                 | Actual                      | Match    |
| ------ | ------------------------ | --------------------------- | -------- |
| 2      | `"2026-03-01T00:00:00Z"` | `"2026-03-01T03:00:00Z"`    | **FAIL** |
| 3      | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"`    | PASS     |
| 4      | Same format              | Different: T03:00 vs T00:00 | **FAIL** |
| 5      | `"2026-03-01T00:00:00Z"` | `"2026-02-28T18:30:00Z"`    | **FAIL** |
| 6      | `"2026-03-15T00:00:00Z"` | `"2026-03-14T00:00:00Z"`    | **FAIL** |

## Outcome

**FAIL** — Preset and user-input fields store dates via different code paths, producing different DB values for the same timezone context. Mixed timezone storage confirmed within a single record.

## Findings

- **BRT record (DateTest-000080)**:
    - Preset field2: `"2026-03-01T03:00:00Z"` — UTC storage (BRT midnight = 03:00 UTC). Code path: `initCalendarValueV1()` → `new Date()` → `toISOString()` → strip Z.
    - User-input field7: `"2026-03-15T00:00:00Z"` — local midnight stored as-is. Code path: `getSaveValue()` → `moment().format()`.
    - Time component proves mixed path: T03:00 (real UTC) vs T00:00 (fake UTC for local midnight).

- **IST record (DateTest-000084)**:
    - Preset field2: `"2026-02-28T18:30:00Z"` — UTC storage. IST midnight March 1 = Feb 28 18:30 UTC. The date itself shifts to the PREVIOUS CALENDAR DAY.
    - User-input field7: `"2026-03-14T00:00:00Z"` — BUG-7 shifted to March 14 (not March 15). Local midnight on the wrong day.
    - IST amplifies the problem: preset crosses a month boundary (Mar 1 → Feb 28), user input crosses a day boundary (Mar 15 → Mar 14).

- **Mixed storage in same record**: A single DateTest record contains BOTH UTC-stored values (preset fields) and local-stored values (user-input fields). There is no metadata in the database indicating which timezone context applies to each value. SQL Server treats all as naive `datetime`.

- **Note on different dates**: The preset date is March 1 and user-input is March 15 — these are different logical dates, so the values can't be directly compared. But the TIME COMPONENT difference (T03:00 for BRT preset vs T00:00 for BRT user-input) conclusively proves the different storage paths.
