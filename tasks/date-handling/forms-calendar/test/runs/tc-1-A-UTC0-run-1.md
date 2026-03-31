# TC-1-A-UTC0 — Run 1 | 2026-03-30 | UTC+0 | PASS

**Spec**: [tc-1-A-UTC0.md](../tc-1-A-UTC0.md) | **Summary**: [summary](../summaries/tc-1-A-UTC0.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-30                                  |
| Tester TZ | `GMT` — UTC+0 (GMT)                         |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField7` (`enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`. UTC+0 confirmed via `new Date(2026, 2, 15, 0, 0, 0).toISOString()` → `"2026-03-15T00:00:00.000Z"`.

## Step Results

| Step #                    | Expected                     | Actual                       | Match |
| ------------------------- | ---------------------------- | ---------------------------- | ----- |
| Step 5 — raw stored value | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| Step 6 — GetFieldValue    | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| Step 7 — isoRef           | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Config A, UTC+0 control: date-only popup stores `"2026-03-15"` with no shift. Confirms Bug #7 does not affect UTC+0 (midnight UTC = midnight local — same calendar day).

## Findings

- UTC+0 control for Bug #7: at UTC+0, local midnight equals UTC midnight so `getSaveValue()` extracts the same calendar day — no shift.
- This run serves as the zero-drift control pairing with tc-1-A-IST.md (FAIL) and tc-1-A-BRT.md (PASS).
- GetFieldValue returns raw date string directly with no transformation for date-only Config A.
- Round-trip is stable at UTC+0 for all date-only configs.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
