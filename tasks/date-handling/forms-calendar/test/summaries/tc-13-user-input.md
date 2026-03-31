# TC-13-user-input — Summary

**Spec**: [tc-2-10-db-storage-mixed-tz-brt.md](../tc-2-10-db-storage-mixed-tz-brt.md)
**Current status**: PASS — last run 2026-03-27 (BRT)
**Bug surface**: none — confirms expected (but problematic) local-time storage behavior for user-input fields

## Run History

| Run | Date       | TZ  | Outcome | File                                       |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-13-user-input-run-1.md) |

## Current Interpretation

User-input calendar fields (`enableInitialValue=false`, Configs A/C/D) store local BRT datetime values in the database without any timezone suffix. `getSaveValue()` extracts local time components from the Date object and formats them as `"MM/dd/yyyy HH:mm:ss"`, producing `3/15/2026 12:00:00 AM` for BRT midnight March 15. The database receives this as a raw local time with no timezone context. This is the opposite convention from initial-value fields, which store UTC (see 13-initial-values): initial-value fields go through `new Date().toISOString()` → strip Z → UTC value; user-input fields go through `getSaveValue()` local component extraction → local value. The result is a mixed-timezone database where the same logical concept ("midnight on a date") has two incompatible representations depending on how the field's initial value was configured. Any SQL query filtering or comparing dates across field types will produce silently incorrect results.

## Next Action

No further action needed for this specific scenario — the local storage path is confirmed. The actionable finding is the mixed-timezone storage pattern documented in `analysis.md`. A future fix should unify the storage convention. When testing from IST, user-input fields in IST would store IST midnight — a third representation would appear in the same table.
