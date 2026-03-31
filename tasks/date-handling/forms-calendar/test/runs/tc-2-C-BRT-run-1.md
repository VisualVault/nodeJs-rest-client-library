# TC-2-C-BRT — Run 1 | 2026-03-27 | BRT | PASS

**Spec**: [tc-1-2-typed-input-brt.md](../tc-1-2-typed-input-brt.md) | **Summary**: [summary](../summaries/tc-2-C-BRT.md)

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

| Step # | Expected                                                                   | Actual                       | Match |
| ------ | -------------------------------------------------------------------------- | ---------------------------- | ----- |
| 1      | All P1–P6 checks pass                                                      | All P1–P6 checks pass        | PASS  |
| 2–9    | Typed entry `03/15/2026 12:00 AM`; display `03/15/2026 12:00 AM` after Tab | Correct entry and display    | PASS  |
| 11     | `"2026-03-15T00:00:00"` (raw stored)                                       | `"2026-03-15T00:00:00"`      | PASS  |
| 12     | `"2026-03-15T00:00:00"` (GFV unchanged)                                    | `"2026-03-15T00:00:00"`      | PASS  |
| 13     | `"2026-03-15T03:00:00.000Z"` (BRT confirmed)                               | `"2026-03-15T03:00:00.000Z"` | PASS  |

> Note: Config C is DataField6 (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`). Confirmed in same BRT session as 2-A-BRT and 2-D-BRT. Steps 2–9 follow the full datetime segment entry (month, day, year, hour, minute, AM/PM). Config C is the UTC control field — stores real UTC; in BRT midnight `getSaveValue()` stores the local time string directly.

## Outcome

**PASS** — Typed datetime input in BRT stores correct local midnight for Config C (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`).

## Findings

- DateTime typed input in BRT stores `"2026-03-15T00:00:00"` — the local midnight string, same as the calendar popup.
- Config C does not exercise Bug #5 from the typed input path (GFV unchanged).
- Result matches popup (1-C-BRT) — Bug #2 absent for this config in BRT.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
