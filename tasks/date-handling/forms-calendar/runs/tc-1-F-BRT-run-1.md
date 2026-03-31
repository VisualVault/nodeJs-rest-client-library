# TC-1-F-BRT — Run 1 | 2026-03-31 | BRT | FAIL-1

**Spec**: [tc-1-F-BRT.md](../test-cases/tc-1-F-BRT.md) | **Summary**: [summary](../summaries/tc-1-F-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField11` (`enableTime=false`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`. BRT confirmed via `new Date(2026, 2, 15, 0, 0, 0).toISOString()` → `"2026-03-15T03:00:00.000Z"`.

## Step Results

| Step #                    | Expected                                    | Actual                       | Match    |
| ------------------------- | ------------------------------------------- | ---------------------------- | -------- |
| Step 5 — raw stored value | `"2026-03-15"` (date-only, per expectation) | `"2026-03-15T03:00:00.000Z"` | **FAIL** |
| Step 6 — GetFieldValue    | `"2026-03-15"`                              | `"2026-03-15T03:00:00.000Z"` | **FAIL** |
| Step 7 — isoRef           | `"2026-03-15T03:00:00.000Z"`                | `"2026-03-15T03:00:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Legacy popup path stores full UTC datetime `"2026-03-15T03:00:00.000Z"` same as Config E. `ignoreTimezone=true` has no effect on the legacy popup path — storage format is identical to Config E-BRT.

## Findings

- Config F produces identical stored values to Config E in BRT — the `ignoreTimezone` flag has no effect on the legacy popup path for date-only fields.
- Same failure mode as tc-1-E-BRT.md: legacy path stores full UTC datetime string instead of date-only.
- This rules out the hypothesis that `ignoreTimezone=true` might cause UTC midnight storage (vs local midnight) on the legacy path — both E and F store local midnight in UTC.
- GetFieldValue returns the same UTC datetime string without transformation.
- The only difference between E and F is the `ignoreTimezone` flag; this test confirms that flag is inert on the legacy popup path.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
