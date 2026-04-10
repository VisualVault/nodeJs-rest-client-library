# TC-1-D-IST — Run 1 | 2026-03-30 | IST | FAIL-2

**Spec**: [tc-1-D-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-1-D-IST.md) | **Summary**: [summary](../summaries/tc-1-D-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-30                                  |
| Tester TZ | `Asia/Calcutta` — UTC+5:30 (IST)            |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField5` (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`. IST confirmed via `new Date(2026, 2, 15, 0, 0, 0).toISOString()` → `"2026-03-14T18:30:00.000Z"`.

## Step Results

| Step #                    | Expected                     | Actual                       | Match    |
| ------------------------- | ---------------------------- | ---------------------------- | -------- |
| Step 9 — raw stored value | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS     |
| Step 10 — GetFieldValue   | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| Step 11 — isoRef          | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-2** — Bug #5 confirmed in IST: `GetFieldValue()` returns `"2026-03-15T00:00:00.000Z"` (fake Z appended to local IST midnight). Raw storage is correct. Round-trip drift in IST is +5:30h per trip (forward, opposite direction to BRT).

## Findings

- Raw stored value is correct: local IST midnight stored as `"2026-03-15T00:00:00"` (same as Config C in IST — `getSaveValue()` formats local time; `ignoreTimezone` flag has no effect on storage).
- Bug #5 active: `getCalendarFieldValue()` appends fake `[Z]` via `moment(value).format("....[Z]")`. The fake Z makes local IST midnight appear as UTC midnight March 15, but real UTC is March 14 18:30Z.
- Round-trip drift in IST: SetFieldValue with `"2026-03-15T00:00:00.000Z"` → JS parses as UTC midnight → IST local = March 15 05:30 AM → stored `"2026-03-15T05:30:00"` (+5:30h). Date shifts forward after ~4-5 trips.
- Drift direction in IST is opposite to BRT: IST (UTC+) shifts forward; BRT (UTC-) shifts backward.
- UTC+0 control (tc-1-D-UTC0.md) shows PASS because fake Z coincidentally equals real UTC for UTC+0 users.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
