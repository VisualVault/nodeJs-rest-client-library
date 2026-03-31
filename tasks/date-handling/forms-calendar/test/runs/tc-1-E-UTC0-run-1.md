# TC-1-E-UTC0 — Run 1 | 2026-03-31 | UTC+0 | FAIL-1

**Spec**: [tc-1-E-UTC0.md](../tc-1-E-UTC0.md) | **Summary**: [summary](../summaries/tc-1-E-UTC0.md)

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
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 16:42:54 GMT+0000 (Greenwich Mean Time)"` — contains GMT+0000 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | filter snippet                                              | `["DataField12"]` ✓                                                               |

## Step Results

| Step #                    | Expected                     | Actual                       | Match    |
| ------------------------- | ---------------------------- | ---------------------------- | -------- |
| Step 4 — display          | `"03/15/2026"`               | `"03/15/2026"`               | PASS     |
| Step 5 — raw stored value | `"2026-03-15"`               | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| Step 6 — GetFieldValue    | `"2026-03-15"`               | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| Step 7 — isoRef           | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Legacy popup stores full UTC datetime `"2026-03-15T00:00:00.000Z"` instead of correct date-only `"2026-03-15"`. At UTC+0, the date component is correct (March 15 in both local and UTC) — no date shift — but the storage format is wrong. Same legacy format bug as BRT and IST, but UTC+0 is the only timezone where the stored date component is not affected.

## Findings

- **Matrix prediction corrected**: Expected `"2026-03-15"` (date-only) was wrong. Actual is `"2026-03-15T00:00:00.000Z"` — same full UTC datetime format as all other legacy configs. The original prediction assumed legacy date-only fields would store date-only strings; live tests across all three timezones now confirm they store raw `toISOString()`.
- **Knock-on correction**: 1-F-UTC0 (pending) prediction should be updated from `"2026-03-15"` to `"2026-03-15T00:00:00.000Z"` (ignoreTZ no-op on legacy popup).
- **UTC+0 is the control boundary**: At UTC+0, local midnight = UTC midnight, so `toISOString()` produces `"2026-03-15T00:00:00.000Z"` — the date component (March 15) matches the intended date. Compare with BRT (`"2026-03-15T03:00:00.000Z"` — same day in UTC) and IST (`"2026-03-14T18:30:00.000Z"` — previous day in UTC). UTC+0 confirms the legacy format bug exists but the date-shift problem is zero.
- Display shows `03/15/2026` — correct.
- GetFieldValue returns the stored value without transformation (no fake-Z, same as all legacy configs).
- **Legacy popup format confirmed universal**: All three TZs (BRT, IST, UTC+0) now show the same `toISOString()` storage. The legacy popup ALWAYS stores raw UTC datetime with Z, for every config (E/F/G/H), regardless of `enableTime` or `ignoreTimezone` settings.
