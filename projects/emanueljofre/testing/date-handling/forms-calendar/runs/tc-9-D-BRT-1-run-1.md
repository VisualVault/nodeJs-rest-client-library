# TC-9-D-BRT-1 — Run 1 | 2026-03-27 | BRT | FAIL-2

**Spec**: [tc-1-3-roundtrip-brt.md](tasks/date-handling/forms-calendar/test-cases/tc-1-3-roundtrip-brt.md) | **Summary**: [summary](../summaries/tc-9-D-BRT-1.md)

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

| Step # | Expected                                        | Actual                           | Match    |
| ------ | ----------------------------------------------- | -------------------------------- | -------- |
| 1      | All P1–P6 checks pass                           | All P1–P6 checks pass            | PASS     |
| 2      | No error; field updates                         | No error; field updates          | PASS     |
| 3      | Display: `03/15/2026 12:00 AM`                  | `03/15/2026 12:00 AM`            | PASS     |
| 4      | `"2026-03-15T00:00:00"` (raw before round-trip) | `"2026-03-15T00:00:00"`          | PASS     |
| 5      | `"2026-03-15T00:00:00"` (GFV before round-trip) | `"2026-03-15T00:00:00.000Z"`     | **FAIL** |
| 6      | No error; display unchanged                     | No error                         | PASS     |
| 7      | Display: `03/15/2026 12:00 AM` (no drift)       | `03/14/2026 09:00 PM`            | **FAIL** |
| 8      | `"2026-03-15T00:00:00"` (raw after — no drift)  | `"2026-03-14T21:00:00"`          | **FAIL** |
| 9      | `"2026-03-15T00:00:00"` (GFV after — no drift)  | `"2026-03-14T21:00:00.000Z"`     | **FAIL** |
| 10     | `0` (no drift; idempotent)                      | `-10800000` (−3h = −10800000 ms) | **FAIL** |
| 11     | `"2026-03-15T03:00:00.000Z"` (BRT confirmed)    | `"2026-03-15T03:00:00.000Z"`     | PASS     |

## Outcome

**FAIL-2** — Bug #5 fake Z in `GetFieldValue` caused -3h drift per round-trip; after 1 trip stored value shifted from `"2026-03-15T00:00:00"` to `"2026-03-14T21:00:00"`.

## Findings

- Step 5: `GetFieldValue` returned `"2026-03-15T00:00:00.000Z"` — fake Z appended (Bug #5 active on read path).
- Step 6: `SetFieldValue` parsed the fake-Z value as UTC midnight; in BRT (UTC-3) that is 21:00 March 14.
- Step 8: Raw stored value confirmed `"2026-03-14T21:00:00"` — exactly -3h from the original.
- Each subsequent round-trip would shift another -3h (8 trips lose a full day; 1 trip from Jan 1 midnight crosses the year boundary).

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
