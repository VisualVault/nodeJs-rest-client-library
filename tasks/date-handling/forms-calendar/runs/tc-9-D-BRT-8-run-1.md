# TC-9-D-BRT-8 — Run 1 | 2026-03-27 | BRT | FAIL-1

**Spec**: [tc-2-8-roundtrip-cumulative-brt.md](../test-cases/tc-2-8-roundtrip-cumulative-brt.md) | **Summary**: [summary](../summaries/tc-9-D-BRT-8.md)

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

> Note: Step 5 array captures Trips 1–10. Trip 8 result `"2026-03-14T00:00:00"` confirms a full day is lost after exactly 8 round-trips starting from BRT midnight (8 × −3h = −24h). This matches the spec FAIL-1 reference table exactly.

## Outcome

**FAIL-1** — Bug #5 cumulative drift confirmed: after 8 round-trips in BRT, `"2026-03-15T00:00:00"` becomes `"2026-03-14T00:00:00"` (full day lost); after 10 trips: `"2026-03-13T18:00:00"` (−30h total).

## Findings

- Step 4: GFV appended fake Z immediately: `"2026-03-15T00:00:00.000Z"` — Bug #5 active from first call.
- Step 5, Trip 1: stored value shifted to `"2026-03-14T21:00:00"` (−3h), matching tc-9-D-BRT-1 result.
- Step 5, Trip 8: `"2026-03-14T00:00:00"` — the stored value has drifted exactly one full day backward; the calendar date is now March 14 instead of March 15.
- Step 5, Trip 10: `"2026-03-13T18:00:00"` — −30h total from the original value; date is now March 13.
- Any production script running `SetFieldValue(GetFieldValue())` on a Config D field in BRT will silently corrupt the date at a rate of −3h per execution.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
