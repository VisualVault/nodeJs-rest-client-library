# TC-1-E-IST — Run 1 | 2026-03-31 | IST | FAIL-1

**Spec**: [tc-1-E-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-1-E-IST.md) | **Summary**: [summary](../summaries/tc-1-E-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | `Asia/Calcutta` — UTC+5:30 (IST)            |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField12` (`enableTime=false`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`. IST confirmed via `new Date(2026, 2, 15, 0, 0, 0).toISOString()` → `"2026-03-14T18:30:00.000Z"`.

## Step Results

| Step #                    | Expected                                    | Actual                       | Match    |
| ------------------------- | ------------------------------------------- | ---------------------------- | -------- |
| Step 5 — raw stored value | `"2026-03-15"` (date-only, per expectation) | `"2026-03-14T18:30:00.000Z"` | **FAIL** |
| Step 6 — GetFieldValue    | `"2026-03-15"`                              | `"2026-03-14T18:30:00.000Z"` | **FAIL** |
| Step 7 — isoRef           | `"2026-03-14T18:30:00.000Z"`                | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Legacy popup in IST stores full UTC datetime `"2026-03-14T18:30:00.000Z"`. The UTC date portion is March 14 — the day before the selected date — because IST midnight March 15 = 2026-03-14T18:30:00Z. Two failure modes compound: legacy format (full UTC datetime instead of date-only) + previous-day UTC date portion.

## Findings

- Legacy popup stores the full UTC datetime representation of IST midnight: `2026-03-15 00:00 IST = 2026-03-14T18:30:00Z` — the UTC date is March 14, not March 15.
- Two failure modes stack: (1) legacy format stores full UTC datetime instead of date-only, and (2) for UTC+ timezones the UTC date portion is the previous calendar day.
- The field display shows `03/15/2026` (correct local date) because the display layer re-converts the UTC datetime to local IST — but storage holds the previous day's UTC date.
- Compare with tc-1-E-BRT.md: in BRT the stored UTC datetime is `"2026-03-15T03:00:00.000Z"` — same local date in the UTC date portion, because UTC-3 midnight is still March 15 UTC. In IST (UTC+5:30), the UTC date crosses midnight backward.
- GetFieldValue returns the same UTC datetime string without additional transformation.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
