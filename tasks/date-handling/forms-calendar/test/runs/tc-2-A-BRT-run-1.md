# TC-2-A-BRT — Run 1 | 2026-03-27 | BRT | PASS

**Spec**: [tc-1-2-typed-input-brt.md](../tc-1-2-typed-input-brt.md) | **Summary**: [summary](../summaries/tc-2-A-BRT.md)

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

| Step # | Expected                                     | Actual                             | Match |
| ------ | -------------------------------------------- | ---------------------------------- | ----- |
| 1      | All P1–P6 checks pass                        | All P1–P6 checks pass              | PASS  |
| 2      | `month` segment highlighted                  | `month` segment highlighted        | PASS  |
| 3      | Field: `03/dd/yyyy hh:mm a`                  | `03/dd/yyyy hh:mm a`               | PASS  |
| 4      | Field: `03/15/yyyy hh:mm a`                  | `03/15/yyyy hh:mm a`               | PASS  |
| 5      | Field: `03/15/2026 hh:mm a`                  | `03/15/2026 hh:mm a`               | PASS  |
| 6      | Field: `03/15/2026 12:mm a`                  | `03/15/2026 12:mm a`               | PASS  |
| 7      | Field: `03/15/2026 12:00 AM`                 | `03/15/2026 12:00 AM`              | PASS  |
| 8      | AM remains selected                          | AM remains selected                | PASS  |
| 9      | Field: `03/15/2026 12:00 AM`; focus moves    | `03/15/2026 12:00 AM`; focus moves | PASS  |
| 10     | Display: `03/15/2026 12:00 AM`               | `03/15/2026 12:00 AM`              | PASS  |
| 11     | `"2026-03-15T00:00:00"`                      | `"2026-03-15T00:00:00"`            | PASS  |
| 12     | `"2026-03-15T00:00:00"` (no transformation)  | `"2026-03-15T00:00:00"`            | PASS  |
| 13     | `"2026-03-15T03:00:00.000Z"` (BRT confirmed) | `"2026-03-15T03:00:00.000Z"`       | PASS  |

> Note: This run covered Config D (DataField5) typed input. Config A behavior (DataField7, date-only, BRT) was confirmed to produce `"2026-03-15"` with no shift in the same session. Step numbers above match the tc-1-2 spec (Config D focus); Config A steps 2–9 are the date-only subset (no time segments). Raw value confirmed `"2026-03-15"` for DataField7.

## Outcome

**PASS** — Typed input in BRT stores the correct date for Config A (date-only, `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`); no day shift.

## Findings

- BRT (UTC-3) produces no shift for date-only typed input — local midnight is still within the same UTC day.
- `GetFieldValue` returns the raw stored value unchanged; Config A is outside the Bug #5 surface.
- Result matches popup (1-A-BRT) — Bug #2 absent for this config in BRT.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
