# TC-1-B-IST — Run 1 | 2026-03-30 | IST | FAIL-1

**Spec**: [tc-1-B-IST.md](../test-cases/tc-1-B-IST.md) | **Summary**: [summary](../summaries/tc-1-B-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-30                                  |
| Tester TZ | `Asia/Calcutta` — UTC+5:30 (IST)            |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField10` (`enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`. IST confirmed via `new Date(2026, 2, 15, 0, 0, 0).toISOString()` → `"2026-03-14T18:30:00.000Z"`.

## Step Results

| Step #                    | Expected                     | Actual                       | Match    |
| ------------------------- | ---------------------------- | ---------------------------- | -------- |
| Step 6 — raw stored value | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| Step 7 — GetFieldValue    | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| Step 8 — isoRef           | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Bug #7 confirmed: popup selection of March 15 stored `"2026-03-14"` (-1 day). Config B result is identical to Config A — `ignoreTimezone=true` has no effect on date-only storage.

## Findings

- Bug #7 active: same mechanism as tc-1-A-IST — `normalizeCalValue()` local parse, `getSaveValue()` UTC extraction → previous calendar day at UTC+5:30.
- The `ignoreTimezone` flag has no effect on date-only storage or Bug #7 behavior. Config B and Config A produce identical stored values for the same popup action in IST.
- `ignoreTimezone` only affects `getCalendarFieldValue()` output when `enableTime=true` (Bug #5 path); for date-only fields it is inert.
- Display shows `03/15/2026` (correct) while storage holds `"2026-03-14"` — same symptom as Config A.
- Rules out the hypothesis that ignoreTZ might protect against Bug #7 for date-only fields.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
