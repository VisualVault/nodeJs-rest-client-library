# TC-13-initial-values — Summary

**Spec**: [tc-2-10-db-storage-mixed-tz-brt.md](../tc-2-10-db-storage-mixed-tz-brt.md)
**Current status**: PASS — last run 2026-03-27 (BRT)
**Bug surface**: none — confirms expected (but problematic) UTC storage behavior for initial-value fields

## Run History

| Run | Date       | TZ  | Outcome | File                                           |
| --- | ---------- | --- | ------- | ---------------------------------------------- |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-13-initial-values-run-1.md) |

## Current Interpretation

Initial-value calendar fields (`enableInitialValue=true`, Config A) store UTC datetime values in the database. `initCalendarValueV1()` constructs a JavaScript `Date` object for CurrentDate (`new Date()`) or Preset date values; `getSaveValue()` calls `.toISOString()` and strips the trailing Z, producing a UTC datetime string like `"2026-03-01T03:00:00"` stored without any timezone indicator. The database shows this as `3/1/2026 3:00:00 AM` — the UTC equivalent of BRT midnight March 1. This UTC storage is internally consistent for initial-value fields but creates a mixed-timezone storage problem when the same form has user-input fields that store local time (see 13-user-input). SQL queries joining or comparing dates across field types will produce silently incorrect results because the database does not record the timezone context of each stored value.

## Next Action

No further action needed for this specific scenario — the UTC storage path is confirmed. The actionable finding is documented under the mixed-timezone storage pattern in `analysis.md`. A future fix should normalize all field types to a single storage convention (either all UTC with Z, or all local with offset, but not mixed).
