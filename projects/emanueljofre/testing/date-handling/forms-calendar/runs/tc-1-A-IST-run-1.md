# TC-1-A-IST — Run 1 | 2026-03-30 | IST | FAIL-1

**Spec**: [tc-1-A-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-1-A-IST.md) | **Summary**: [summary](../summaries/tc-1-A-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-30                                  |
| Tester TZ | `Asia/Calcutta` — UTC+5:30 (IST)            |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField7` (`enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`. IST confirmed via `new Date(2026, 2, 15, 0, 0, 0).toISOString()` → `"2026-03-14T18:30:00.000Z"`.

## Step Results

| Step #                    | Expected                     | Actual                       | Match    |
| ------------------------- | ---------------------------- | ---------------------------- | -------- |
| Step 6 — raw stored value | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| Step 7 — GetFieldValue    | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| Step 8 — isoRef           | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Bug #7 confirmed: popup selection of March 15 stored `"2026-03-14"` (-1 day). Display shows `03/15/2026` (correct) while storage holds the previous day.

## Findings

- Bug #7 active: `normalizeCalValue()` parses the date string as local IST midnight; `getSaveValue()` extracts the UTC date, which at UTC+5:30 falls on March 14 (18:30Z = prev calendar day).
- Display value is correct (`03/15/2026`) because the display layer re-converts the stored value to local time, but storage is one day earlier than intended.
- GetFieldValue reflects the shifted stored value — no additional transformation for date-only Config A.
- This confirms Bug #7 triggers for all UTC+ timezones. BRT (UTC-3) is unaffected because UTC-3 midnight is the same calendar day.
- Next step: verify ignoreTZ has no effect on Bug #7 — see tc-1-B-IST.md (Config B).

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
