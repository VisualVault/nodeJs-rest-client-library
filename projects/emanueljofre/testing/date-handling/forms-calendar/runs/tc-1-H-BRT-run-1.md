# TC-1-H-BRT — Run 1 | 2026-03-31 | BRT | FAIL-1

**Spec**: [tc-1-H-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-1-H-BRT.md) | **Summary**: [summary](../summaries/tc-1-H-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField13` (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`. BRT confirmed via `new Date(2026, 2, 15, 0, 0, 0).toISOString()` → `"2026-03-15T03:00:00.000Z"`.

## Step Results

| Step #                    | Expected                                    | Actual                       | Match    |
| ------------------------- | ------------------------------------------- | ---------------------------- | -------- |
| Step 7 — raw stored value | `"2026-03-15"` (date-only, per expectation) | `"2026-03-15T03:00:00.000Z"` | **FAIL** |
| Step 8 — GetFieldValue    | `"2026-03-15"`                              | `"2026-03-15T03:00:00.000Z"` | **FAIL** |
| Step 9 — isoRef           | `"2026-03-15T03:00:00.000Z"`                | `"2026-03-15T03:00:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Legacy DateTime + ignoreTZ popup stores full UTC datetime `"2026-03-15T03:00:00.000Z"`. Same storage pattern as Configs E, F, G. `ignoreTimezone=true` has no effect on the legacy popup path.

## Findings

- Config H produces identical stored values to Configs E, F, G in BRT — all legacy configs use the same full UTC datetime storage path.
- `ignoreTimezone=true` does not change the legacy popup behavior: value is still a full UTC datetime string with real Z.
- The fake-Z Bug #5 is NOT active on the legacy path (`useLegacy=true`) — `getCalendarFieldValue()` does not add a fake Z for legacy fields. GetFieldValue returns the real Z value unchanged.
- Round-trip is stable for Config H in BRT: real Z value round-trips correctly (no drift).
- This completes the BRT legacy popup matrix: E, F, G, H all FAIL on format (UTC datetime vs expected date-only) but are internally consistent — same storage mechanism across all legacy configs.
- In IST the date portion of the stored UTC datetime would shift to previous day for all legacy configs.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
