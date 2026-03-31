# TC-1-D-UTC0 — Run 1 | 2026-03-31 | UTC+0 | PASS

**Spec**: [tc-1-D-UTC0.md](../tc-1-D-UTC0.md) | **Summary**: [summary](../summaries/tc-1-D-UTC0.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | `GMT` — UTC+0 (GMT)                         |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField5` (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`. UTC+0 confirmed via `new Date(2026, 2, 15, 0, 0, 0).toISOString()` → `"2026-03-15T00:00:00.000Z"`.

## Step Results

| Step #                    | Expected                     | Actual                       | Match |
| ------------------------- | ---------------------------- | ---------------------------- | ----- |
| Step 6 — raw stored value | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS  |
| Step 7 — GetFieldValue    | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00.000Z"` | PASS  |
| Step 8 — isoRef           | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Config D, UTC+0: Bug #5 is present (fake Z appended) but coincidentally correct at UTC+0. Fake Z equals real UTC midnight — no drift occurs. Outcome is PASS because the test expected `"2026-03-15T00:00:00.000Z"` and that is what was returned.

## Findings

- Bug #5 is active (fake Z is appended by `getCalendarFieldValue()`) but at UTC+0 the fake Z coincidentally equals the real UTC equivalent of local midnight — no drift on round-trip.
- This is the UTC+0 control for Bug #5 drift tests. Compare with tc-1-D-BRT.md (FAIL-2, -3h drift) and tc-1-D-IST.md (FAIL-2, +5:30h drift).
- The PASS outcome does NOT mean Bug #5 is absent — the code path is identical, only the timezone offset is zero so the error is invisible.
- Any user switching to a non-UTC+0 timezone after data entry will experience drift if they trigger a round-trip.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
