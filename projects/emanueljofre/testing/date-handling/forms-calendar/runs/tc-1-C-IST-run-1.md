# TC-1-C-IST — Run 1 | 2026-03-30 | IST | PASS

**Spec**: [tc-1-C-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-1-C-IST.md) | **Summary**: [summary](../summaries/tc-1-C-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-30                                  |
| Tester TZ | `Asia/Calcutta` — UTC+5:30 (IST)            |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField6` (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`. IST confirmed via `new Date(2026, 2, 15, 0, 0, 0).toISOString()` → `"2026-03-14T18:30:00.000Z"`.

## Step Results

| Step #                    | Expected                | Actual                  | Match |
| ------------------------- | ----------------------- | ----------------------- | ----- |
| Step 8 — raw stored value | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| Step 9 — GetFieldValue    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — Config C, IST: DateTime popup stores local IST midnight `"2026-03-15T00:00:00"` correctly; GetFieldValue returns the proper UTC-converted value. No date shift in storage.

## Findings

- Config C (enableTime=true, ignoreTZ=false) stores local midnight correctly. The DateTime path (`getSaveValue()`) formats as local time without Z — `"2026-03-15T00:00:00"` — which is correct.
- GetFieldValue applies `new Date(value).toISOString()` which correctly converts local midnight to `"2026-03-14T18:30:00.000Z"` (real UTC for IST midnight) — stable round-trip.
- Config C is not affected by Bug #7 (which hits date-only fields A/B) because the DateTime path uses the time component to anchor the value without UTC date extraction.
- Confirms that Bug #5 is isolated to the `ignoreTimezone=true` branch — Config C (ignoreTZ=false) does not add fake Z.
- Config D in IST will differ only in GetFieldValue (fake Z added) — tc-1-D-IST.md.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
