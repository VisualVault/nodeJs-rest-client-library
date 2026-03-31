# TC-9-D-IST-1 — Run 1 | 2026-03-27 | IST | FAIL-1

**Spec**: [tc-2-5-roundtrip-ist.md](../test-cases/tc-2-5-roundtrip-ist.md) | **Summary**: [summary](../summaries/tc-9-D-IST-1.md)

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

| Step # | Expected                                                          | Actual                       | Match    |
| ------ | ----------------------------------------------------------------- | ---------------------------- | -------- |
| 1      | All P1–P6 checks pass                                             | All P1–P6 checks pass        | PASS     |
| 2      | No error; field updates                                           | No error                     | PASS     |
| 3      | Display: `03/15/2026 12:00 AM`                                    | `03/15/2026 12:00 AM`        | PASS     |
| 4      | Raw stored: `"2026-03-15T00:00:00"`                               | `"2026-03-15T00:00:00"`      | PASS     |
| 5      | GFV: `"2026-03-15T00:00:00"` (same as raw, no transformation)     | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| 6      | No error; field display unchanged                                 | Field display changed        | **FAIL** |
| 7      | Display: `03/15/2026 12:00 AM` (no drift)                         | `03/15/2026 05:30 AM`        | **FAIL** |
| 8      | Raw stored after round-trip: `"2026-03-15T00:00:00"` (no drift)   | `"2026-03-15T05:30:00"`      | **FAIL** |
| 9      | GFV after round-trip: `"2026-03-15T00:00:00"` (no transformation) | `"2026-03-15T05:30:00.000Z"` | **FAIL** |
| 10     | `"2026-03-14T18:30:00.000Z"` (IST confirmed)                      | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Bug #5 fake Z in IST caused +5:30h forward drift after 1 round-trip; stored value shifted from `"2026-03-15T00:00:00"` to `"2026-03-15T05:30:00"`.

## Findings

- Step 5: GFV returned `"2026-03-15T00:00:00.000Z"` — fake Z appended (Bug #5 active, same as BRT).
- Step 6: `SetFieldValue` parsed the fake-Z value as UTC midnight; in IST (UTC+5:30) that is 05:30 on March 15.
- Step 8: Raw stored value confirmed `"2026-03-15T05:30:00"` — exactly +5:30h from the original.
- Drift direction is opposite to BRT: IST (UTC+) drifts forward; BRT (UTC-) drifts backward. See tc-2-4 for the cross-timezone drift formula.
- After ~4–5 trips in IST, the +5:30h cumulative drift would exceed 24h and advance the calendar date to March 16.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
