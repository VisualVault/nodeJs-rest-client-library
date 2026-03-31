# TC-9-D-BRT-10 — Run 1 | 2026-03-27 | BRT | FAIL-1

**Spec**: [tc-2-8-roundtrip-cumulative-brt.md](../test-cases/tc-2-8-roundtrip-cumulative-brt.md) | **Summary**: [summary](../summaries/tc-9-D-BRT-10.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-27                                  |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (pre-2026-04-01).

## Step Results

| Step # | Expected                                                    | Actual                                                                                                                                                                                                                          | Match    |
| ------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1      | All P1–P6 checks pass                                       | All P1–P6 checks pass                                                                                                                                                                                                           | PASS     |
| 2      | No error; field updates to baseline `"2026-03-15T00:00:00"` | No error                                                                                                                                                                                                                        | PASS     |
| 3      | Trip 0 raw: `"2026-03-15T00:00:00"`                         | `"2026-03-15T00:00:00"`                                                                                                                                                                                                         | PASS     |
| 4      | Trip 0 GFV: `"2026-03-15T00:00:00"` (no transformation)     | `"2026-03-15T00:00:00.000Z"`                                                                                                                                                                                                    | **FAIL** |
| 5      | 10-element array: all `"2026-03-15T00:00:00"`               | `["2026-03-14T21:00:00","2026-03-14T18:00:00","2026-03-14T15:00:00","2026-03-14T12:00:00","2026-03-14T09:00:00","2026-03-14T06:00:00","2026-03-14T03:00:00","2026-03-14T00:00:00","2026-03-13T21:00:00","2026-03-13T18:00:00"]` | **FAIL** |
| 6      | Display `03/15/2026 12:00 AM` (no drift)                    | `03/13/2026 06:00 PM`                                                                                                                                                                                                           | **FAIL** |
| 7      | Raw at Trip 10: `"2026-03-15T00:00:00"` (no drift)          | `"2026-03-13T18:00:00"`                                                                                                                                                                                                         | **FAIL** |
| 8      | GFV at Trip 10: `"2026-03-15T00:00:00"` (no transformation) | `"2026-03-13T18:00:00.000Z"`                                                                                                                                                                                                    | **FAIL** |
| 9      | `"2026-03-15T03:00:00.000Z"` (BRT confirmed)                | `"2026-03-15T03:00:00.000Z"`                                                                                                                                                                                                    | PASS     |

> Note: This run shares the same 10-trip loop session as 9-D-BRT-8. The specific milestone captured here is Trip 10: `"2026-03-13T18:00:00"` (−30h from the original `"2026-03-15T00:00:00"`). The full trip-by-trip array matches the Bug #5 drift reference table in the tc-2-8 spec exactly.

## Outcome

**FAIL-1** — Bug #5 cumulative drift confirmed at 10 trips: stored value is `"2026-03-13T18:00:00"` — March 13 at 18:00, which is −30h from the original March 15 midnight.

## Findings

- After 10 round-trips: original date March 15 has drifted to March 13 18:00 (−30h); the calendar date is off by nearly two full days.
- Trip 8 milestone (full day lost): `"2026-03-14T00:00:00"` — confirmed within the same run as 9-D-BRT-8.
- Each trip compounds −3h regardless of the current stored value — the drift rate is constant until the year boundary is approached.
- A script that reads and re-writes a Config D field once per day (e.g., a scheduled nightly process) would lose ~1 day every 8 executions.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
