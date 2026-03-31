# TC-2-B-BRT — Run 1 | 2026-03-27 | BRT | PASS

**Spec**: [tc-1-2-typed-input-brt.md](../tc-1-2-typed-input-brt.md) | **Summary**: [summary](../summaries/tc-2-B-BRT.md)

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

| Step # | Expected                                                 | Actual                       | Match |
| ------ | -------------------------------------------------------- | ---------------------------- | ----- |
| 1      | All P1–P6 checks pass                                    | All P1–P6 checks pass        | PASS  |
| 2–9    | Typed entry `03/15/2026`; display `03/15/2026` after Tab | Correct entry and display    | PASS  |
| 11     | `"2026-03-15"` (raw stored)                              | `"2026-03-15"`               | PASS  |
| 12     | `"2026-03-15"` (GFV unchanged)                           | `"2026-03-15"`               | PASS  |
| 13     | `"2026-03-15T03:00:00.000Z"` (BRT confirmed)             | `"2026-03-15T03:00:00.000Z"` | PASS  |

> Note: Config B is DataField10 (`enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`). Confirmed in same BRT session as 2-A-BRT. `ignoreTimezone=true` has no effect on the date-only save path — result identical to Config A.

## Outcome

**PASS** — Typed input in BRT stores the correct date for Config B (date-only, `enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`); no day shift.

## Findings

- `ignoreTimezone=true` produces identical behavior to `ignoreTimezone=false` for date-only typed input in BRT.
- No Bug #5 surface (Config B is `enableTime=false`).
- Result matches popup (1-B-BRT) — Bug #2 absent for this config in BRT.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
