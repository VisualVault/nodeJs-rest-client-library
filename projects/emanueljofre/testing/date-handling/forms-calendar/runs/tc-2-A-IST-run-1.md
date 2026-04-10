# TC-2-A-IST — Run 1 | 2026-03-31 | IST | FAIL-1

**Spec**: [tc-2-A-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-2-A-IST.md) | **Summary**: [summary](../summaries/tc-2-A-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | `Asia/Calcutta` — UTC+5:30 (IST)            |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (pre-2026-04-01).

## Step Results

| Step # | Expected                                                    | Actual                                      | Match    |
| ------ | ----------------------------------------------------------- | ------------------------------------------- | -------- |
| 1      | All P1–P6 checks pass                                       | All P1–P6 checks pass                       | PASS     |
| 2      | Field enters segment-edit mode; `month` segment highlighted | Segment-edit mode active; month highlighted | PASS     |
| 3      | Field: `03/day/year`; cursor advances to day                | `03/day/year`; cursor on day                | PASS     |
| 4      | Field: `03/15/year`; cursor advances to year                | `03/15/year`; cursor on year                | PASS     |
| 5      | Field: `03/15/2026`; year highlighted                       | `03/15/2026`; year highlighted              | PASS     |
| 6      | Focus moves; field displays `03/15/2026`                    | Focus moved; field shows `03/15/2026`       | PASS     |
| 7      | `"2026-03-15"` (correct, no shift)                          | `"2026-03-14"`                              | **FAIL** |
| 8      | `"2026-03-15"` (GFV unchanged)                              | `"2026-03-14"`                              | **FAIL** |
| 9      | `"2026-03-14T18:30:00.000Z"` (IST confirmed)                | `"2026-03-14T18:30:00.000Z"`                | PASS     |

## Outcome

**FAIL-1** — Bug #7 active; typed date `03/15/2026` stored as `"2026-03-14"` (-1 day). `normalizeCalValue()` parsed the string as local IST midnight; `getSaveValue()` extracted the UTC date (March 14 in IST).

## Findings

- Step 7: raw stored `"2026-03-14"` — one day earlier than typed.
- Step 8: GFV returned `"2026-03-14"` — no additional transformation (Config A outside Bug #5 surface).
- Result matches popup (1-A-IST) — Bug #2 asymmetry not observed; both paths produce the same -1 day shift in IST for `useLegacy=false`.
- Display shows `03/15/2026` while storage holds `"2026-03-14"` — discrepancy is invisible until form reload.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
