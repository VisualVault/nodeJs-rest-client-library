# TC-1-G-BRT — Run 1 | 2026-03-31 | BRT | FAIL-1

**Spec**: [tc-1-G-BRT.md](../test-cases/tc-1-G-BRT.md) | **Summary**: [summary](../summaries/tc-1-G-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField14` (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`. BRT confirmed via `new Date(2026, 2, 15, 0, 0, 0).toISOString()` → `"2026-03-15T03:00:00.000Z"`.

## Step Results

| Step #                    | Expected                                    | Actual                       | Match    |
| ------------------------- | ------------------------------------------- | ---------------------------- | -------- |
| Step 5 — raw stored value | `"2026-03-15"` (date-only, per expectation) | `"2026-03-15T03:00:00.000Z"` | **FAIL** |
| Step 6 — GetFieldValue    | `"2026-03-15"`                              | `"2026-03-15T03:00:00.000Z"` | **FAIL** |
| Step 7 — isoRef           | `"2026-03-15T03:00:00.000Z"`                | `"2026-03-15T03:00:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Legacy DateTime popup (useLegacy=true, enableTime=true) closes immediately on day click without showing a time tab; stores full UTC datetime `"2026-03-15T03:00:00.000Z"`. Same storage pattern as Configs E and F.

## Findings

- Legacy DateTime popup closes immediately on day click — no Time tab appears despite `enableTime=true`. Time is forced to midnight local (00:00 BRT = 03:00Z).
- Storage format is the same full UTC datetime string as Configs E and F: `"2026-03-15T03:00:00.000Z"`.
- The `enableTime=true` flag affects the field display (shows `03/15/2026 12:00 AM`) but does not trigger the modern two-step popup (Date tab → Time tab → Set); the legacy path bypasses it.
- GetFieldValue returns the same UTC datetime without transformation. Z suffix is real (not fake-Z Bug #5), so round-trip is stable at BRT.
- In IST the stored date portion would shift to previous day — tc-1-G-IST.md (pending).
- Establishes that all legacy configs (E/F/G/H) use the same UTC datetime storage format in BRT.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
