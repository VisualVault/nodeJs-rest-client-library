# TC-1-D-BRT — Run 1 | 2026-03-27 | BRT | FAIL-2

**Spec**: [tc-1-1-calendar-popup-brt.md](tasks/date-handling/forms-calendar/test-cases/tc-1-1-calendar-popup-brt.md) | **Summary**: [summary](../summaries/tc-1-D-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | ~2026-03-27                                 |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField5` (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`. BRT confirmed via `new Date(2026, 2, 15, 0, 0, 0).toISOString()` → `"2026-03-15T03:00:00.000Z"`.

## Step Results

| Step #                    | Expected                     | Actual                       | Match    |
| ------------------------- | ---------------------------- | ---------------------------- | -------- |
| Step 8 — raw stored value | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS     |
| Step 9 — GetFieldValue    | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| Step 10 — isoRef          | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS     |

## Outcome

**FAIL-2** — Bug #5 confirmed: `GetFieldValue()` returns `"2026-03-15T00:00:00.000Z"` (fake Z appended to local midnight). Raw storage is correct. Round-trip with this value drifts the date by -3h per trip in BRT.

## Findings

- Raw stored value is correct: local midnight BRT stored as `"2026-03-15T00:00:00"` (no Z).
- Bug #5 active: `getCalendarFieldValue()` appends a literal `[Z]` suffix via `moment(value).format("....[Z]")` when `enableTime=true && ignoreTimezone=true`. The fake Z makes local time appear UTC-anchored.
- Round-trip drift confirmed: SetFieldValue with `"2026-03-15T00:00:00.000Z"` → JS parses as UTC midnight → BRT local = March 14 21:00 → stored `"2026-03-14T21:00:00"` (full day lost after 8 trips).
- In BRT the raw storage step is PASS (UTC-3 midnight is same calendar day); the failure is entirely in GetFieldValue output.
- Next step: verify Bug #5 also affects IST (UTC+5:30) — tc-1-D-IST.md; also verify UTC+0 control — tc-1-D-UTC0.md.

**Full session narrative**: results.md — Session 1, Group 1 (Subscription Packs) + Session 1, Group 2 — Tests 2.2, 2.3, 2.8 (pre-2026-04-01 archive)
