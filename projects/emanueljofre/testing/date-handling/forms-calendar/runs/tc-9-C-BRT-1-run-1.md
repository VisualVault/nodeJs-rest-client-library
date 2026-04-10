# TC-9-C-BRT-1 — Run 1 | 2026-03-27 | BRT | PASS

**Spec**: [tc-2-3-roundtrip-brt.md](tasks/date-handling/forms-calendar/test-cases/tc-2-3-roundtrip-brt.md) | **Summary**: [summary](../summaries/tc-9-C-BRT-1.md)

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

| Step # | Expected                                                                       | Actual                       | Match |
| ------ | ------------------------------------------------------------------------------ | ---------------------------- | ----- |
| 1      | All P1–P6 checks pass                                                          | All P1–P6 checks pass        | PASS  |
| 2      | No error; field updates                                                        | No error                     | PASS  |
| 3      | Display: `03/15/2026 12:00 AM`                                                 | `03/15/2026 12:00 AM`        | PASS  |
| 4      | Raw stored: `"2026-03-15T00:00:00"`                                            | `"2026-03-15T00:00:00"`      | PASS  |
| 5      | GFV: `"2026-03-15T00:00:00"` (same as raw, no transformation)                  | `"2026-03-15T00:00:00"`      | PASS  |
| 6      | No error; field display unchanged                                              | No error; display unchanged  | PASS  |
| 7      | Display: `03/15/2026 12:00 AM` — unchanged, no drift                           | `03/15/2026 12:00 AM`        | PASS  |
| 8      | Raw stored after round-trip: `"2026-03-15T00:00:00"` — unchanged, no drift     | `"2026-03-15T00:00:00"`      | PASS  |
| 9      | GFV after round-trip: `"2026-03-15T00:00:00"` — same as raw, no transformation | `"2026-03-15T00:00:00"`      | PASS  |
| 10     | `"2026-03-15T03:00:00.000Z"` (BRT confirmed)                                   | `"2026-03-15T03:00:00.000Z"` | PASS  |

> Note: Config C is DataField6 (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`). The tc-2-3 spec targets Config D (DataField5); this run executed the same round-trip steps on Config C in the same BRT session. Config C is not in the Bug #5 surface (`ignoreTimezone=false` uses a different GFV code branch), confirming zero drift across the round-trip.

## Outcome

**PASS** — Config C round-trip in BRT is stable; 0 drift; GFV returns the raw value unchanged; Bug #5 absent for `ignoreTimezone=false` fields.

## Findings

- Config C (`ignoreTimezone=false`) uses the correct GFV code path — it does not append a fake Z; it applies a proper UTC offset on read when needed.
- After 1 round-trip the raw stored value is `"2026-03-15T00:00:00"` — identical to the baseline; no drift.
- Config C is confirmed as the stable control for DateTime fields in BRT; Bug #5 is isolated to `ignoreTimezone=true` configs.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
