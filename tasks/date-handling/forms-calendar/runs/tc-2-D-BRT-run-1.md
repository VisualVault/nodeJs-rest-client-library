# TC-2-D-BRT — Run 1 | 2026-03-27 | BRT | PASS

**Spec**: [tc-1-2-typed-input-brt.md](../test-cases/tc-1-2-typed-input-brt.md) | **Summary**: [summary](../summaries/tc-2-D-BRT.md)

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
| 11     | `"2026-03-15T00:00:00"` (raw stored)         | `"2026-03-15T00:00:00"`            | PASS  |
| 12     | `"2026-03-15T00:00:00"` (GFV — same as raw)  | `"2026-03-15T00:00:00"`            | PASS  |
| 13     | `"2026-03-15T03:00:00.000Z"` (BRT confirmed) | `"2026-03-15T03:00:00.000Z"`       | PASS  |

> Note: Config D is DataField5 (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`). This is the primary field for the tc-1-2 spec. All step numbers match exactly. Bug #5 expected on GFV but confirmed absent for typed-input path in this build — GFV returned `"2026-03-15T00:00:00"` (no fake Z), same as raw. Bug #5 was confirmed in the calendar popup path (tc-1-1-calendar-popup-brt.md, tc-2-2-calendar-popup-brt.md) and round-trip (tc-1-3-roundtrip-brt.md).

## Outcome

**PASS** — Typed datetime input in BRT stores correct local midnight for Config D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`); GFV returned clean value without fake Z in this run.

## Findings

- Typed input in BRT stores `"2026-03-15T00:00:00"` — identical to calendar popup; Bug #2 absent.
- GFV returned `"2026-03-15T00:00:00"` — same as raw; Bug #5 did not activate on the typed path in this session.
- Round-trip drift (Bug #5 consequence) confirmed separately via tc-1-3-roundtrip-brt.md.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
