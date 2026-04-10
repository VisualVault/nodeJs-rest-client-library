# TC-9-D-IST-5 — Run 1 | 2026-03-27 | IST | FAIL-1

**Spec**: [tc-2-5-roundtrip-ist.md](tasks/date-handling/forms-calendar/test-cases/tc-2-5-roundtrip-ist.md) | **Summary**: [summary](../summaries/tc-9-D-IST-5.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-27                                  |
| Tester TZ | `Asia/Calcutta` — UTC+5:30 (IST)            |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (pre-2026-04-01).

## Step Results

| Step #     | Expected                                                    | Actual                       | Match    |
| ---------- | ----------------------------------------------------------- | ---------------------------- | -------- |
| 1          | All P1–P6 checks pass                                       | All P1–P6 checks pass        | PASS     |
| 2          | No error; field updates to baseline `"2026-03-15T00:00:00"` | No error                     | PASS     |
| 3          | Display: `03/15/2026 12:00 AM`                              | `03/15/2026 12:00 AM`        | PASS     |
| 4          | Trip 0 raw: `"2026-03-15T00:00:00"`                         | `"2026-03-15T00:00:00"`      | PASS     |
| 5          | GFV: `"2026-03-15T00:00:00"` (no transformation)            | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| 6 (Trip 1) | Raw: `"2026-03-15T00:00:00"`                                | `"2026-03-15T05:30:00"`      | **FAIL** |
| 6 (Trip 2) | Raw: `"2026-03-15T00:00:00"`                                | `"2026-03-15T11:00:00"`      | **FAIL** |
| 6 (Trip 3) | Raw: `"2026-03-15T00:00:00"`                                | `"2026-03-15T16:30:00"`      | **FAIL** |
| 6 (Trip 4) | Raw: `"2026-03-15T00:00:00"`                                | `"2026-03-15T22:00:00"`      | **FAIL** |
| 6 (Trip 5) | Raw: `"2026-03-15T00:00:00"` (no drift)                     | `"2026-03-16T03:30:00"`      | **FAIL** |
| 7          | Display `03/15/2026 12:00 AM` (no drift)                    | `03/16/2026 03:30 AM`        | **FAIL** |
| 8          | Raw at Trip 5: `"2026-03-15T00:00:00"`                      | `"2026-03-16T03:30:00"`      | **FAIL** |
| 9          | GFV at Trip 5: `"2026-03-15T00:00:00"` (no transformation)  | `"2026-03-16T03:30:00.000Z"` | **FAIL** |
| 10         | `"2026-03-14T18:30:00.000Z"` (IST confirmed)                | `"2026-03-14T18:30:00.000Z"` | PASS     |

> Note: Steps 6 (Trip 1–5) represent individual raw-value captures after each round-trip in the 5-trip sequence. Each trip adds +5:30h (330 minutes). Trip 5 total drift: 5 × 5:30h = 27:30h — the calendar date has advanced from March 15 to March 16 and the time reads 03:30 AM.

## Outcome

**FAIL-1** — Bug #5 cumulative drift in IST confirmed at 5 trips: stored value is `"2026-03-16T03:30:00"` — March 16 at 03:30, which is +27:30h from the original March 15 midnight.

## Findings

- Trip 1: `"2026-03-15T05:30:00"` (+5:30h) — single-trip result consistent with 9-D-IST-1.
- Trip 4: `"2026-03-15T22:00:00"` (+22h) — still on March 15 but approaching midnight.
- Trip 5: `"2026-03-16T03:30:00"` (+27:30h) — day boundary crossed; calendar date advanced to March 16.
- In IST, the day boundary is crossed between Trip 4 and Trip 5 (at +24h: 4.36 trips from midnight). With a midnight starting point, exactly 5 trips are required to confirm the date advance.
- Contrast with BRT: the day boundary goes backward (Trip 8 loses March 15 → March 14); in IST the day boundary goes forward.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
