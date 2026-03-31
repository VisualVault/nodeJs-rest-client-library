# TC-2-E-BRT — Run 1 | 2026-03-31 | BRT | PASS

**Spec**: [tc-2-E-BRT.md](../test-cases/tc-2-E-BRT.md) | **Summary**: [summary](../summaries/tc-2-E-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (pre-2026-04-01).

## Step Results

| Step # | Expected                                              | Actual                                   | Match |
| ------ | ----------------------------------------------------- | ---------------------------------------- | ----- |
| 1      | All P1–P6 checks pass                                 | All P1–P6 checks pass                    | PASS  |
| 2      | Field receives focus; activeElement is `<FIELD_NAME>` | Field focused; activeElement confirmed   | PASS  |
| 3      | Field input displays `03/15/2026`                     | `03/15/2026` displayed                   | PASS  |
| 4      | Focus moves; field retains `03/15/2026`               | Focus moved; field retained `03/15/2026` | PASS  |
| 5      | `"2026-03-15"` (raw stored)                           | `"2026-03-15"`                           | PASS  |
| 6      | `"2026-03-15"` (GFV unchanged)                        | `"2026-03-15"`                           | PASS  |
| 7      | `"2026-03-15T03:00:00.000Z"` (BRT confirmed)          | `"2026-03-15T03:00:00.000Z"`             | PASS  |

## Outcome

**PASS** — Typed input on Config E (legacy, `useLegacy=true`, `enableTime=false`) stores date-only string `"2026-03-15"` in BRT; no day shift.

## Findings

- Step 5: raw stored `"2026-03-15"` — date-only string; typed path for `useLegacy=true` stores the date string directly without UTC conversion.
- Step 6: GFV returned `"2026-03-15"` — same as raw; no transformation.
- **Bug #2 confirmed**: The calendar popup for this same Config E field (tc-1-E-BRT.md) stores `"2026-03-15T03:00:00.000Z"` (UTC datetime), while typed input stores `"2026-03-15"` (date-only string). Two different formats for the same intended date on the same field — `calChangeSetValue()` (popup) vs `calChange()` (typed) follow divergent paths for `useLegacy=true`.
- No Bug #7 effect in BRT for date-only typed input (UTC-3 midnight stays within the same UTC day).

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
