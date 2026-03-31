# TC-2-B-IST — Run 1 | 2026-03-31 | IST | FAIL-1

**Spec**: [tc-2-B-IST.md](../test-cases/tc-2-B-IST.md) | **Summary**: [summary](../summaries/tc-2-B-IST.md)

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

**FAIL-1** — Bug #7 active; typed date `03/15/2026` stored as `"2026-03-14"` (-1 day). `ignoreTimezone=true` has no effect on the date-only save path; result identical to Config A (2-A-IST).

## Findings

- Step 7: raw stored `"2026-03-14"` — one day earlier than typed; same as Config A.
- Step 8: GFV returned `"2026-03-14"` — no additional transformation (Config B `enableTime=false`, outside Bug #5 surface).
- `ignoreTimezone=true` does not alter the `normalizeCalValue()` → `getSaveValue()` path for date-only strings — Bug #7 affects both Config A and Config B identically in IST.
- Result matches sibling popup test (1-B-IST) — Bug #2 absent.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
