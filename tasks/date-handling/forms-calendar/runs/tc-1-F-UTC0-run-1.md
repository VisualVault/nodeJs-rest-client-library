# TC-1-F-UTC0 — Run 1 | 2026-03-31 | UTC+0 | FAIL-1

**Spec**: [tc-1-F-UTC0.md](../test-cases/tc-1-F-UTC0.md) | **Summary**: [summary](../summaries/tc-1-F-UTC0.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | `GMT` — UTC+0 (GMT)                         |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                            |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 16:47:26 GMT+0000 (Greenwich Mean Time)"` — contains GMT+0000 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | filter snippet                                              | `["DataField11"]` ✓                                                               |

## Step Results

| Step #                    | Expected                     | Actual                       | Match    |
| ------------------------- | ---------------------------- | ---------------------------- | -------- |
| Step 4 — display          | `"03/15/2026"`               | `"03/15/2026"`               | PASS     |
| Step 5 — raw stored value | `"2026-03-15"`               | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| Step 6 — GetFieldValue    | `"2026-03-15"`               | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| Step 7 — isoRef           | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Legacy popup stores full UTC datetime `"2026-03-15T00:00:00.000Z"` instead of correct date-only `"2026-03-15"`. Identical to tc-1-E-UTC0 — `ignoreTimezone=true` has no effect on legacy popup storage. Date component correct at UTC+0 (no shift).

## Findings

- **ignoreTZ confirmed as no-op at UTC+0**: Config F (ignoreTZ=true) produces `"2026-03-15T00:00:00.000Z"` — identical to Config E (ignoreTZ=false) at tc-1-E-UTC0. This is consistent across all three TZs: BRT (tc-1-F-BRT = tc-1-E-BRT), IST (tc-1-F-IST = tc-1-E-IST), UTC+0 (this test = tc-1-E-UTC0).
- **Category 1 is now 100% complete**: All 20 slots (8 configs × BRT + A/D × UTC+0 + A/B/C/D/E/F/G/H × IST + E/F × UTC+0) are run. 8 PASS, 12 FAIL. Legacy format bug confirmed across all configs and TZs.
- Display shows `03/15/2026` — correct.
- Legacy popup `toISOString()` storage is now fully characterized: same behavior for all 8 configs across all 3 tested timezones. The `enableTime` and `ignoreTimezone` flags have zero effect on legacy popup storage format.
