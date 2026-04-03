# TC-DB-5-DT-EXACT — Summary

**Spec**: [tc-db-5-dt-exact.md](../test-cases/tc-db-5-dt-exact.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: None — but reveals important SQL behavior for DateTime columns

## Run History

| Run | Date       | Outcome | File                                       |
| --- | ---------- | ------- | ------------------------------------------ |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-5-dt-exact-run-1.md) |

## Current Interpretation

SQL `Field6 = '3/15/2026'` matches only midnight records (25 out of ~55 total Field6 records on 3/15). The server treats `'3/15/2026'` as `'3/15/2026 12:00:00 AM'` — an exact datetime comparison, not a date-only comparison. Records with `2:30 PM`, `3:00 AM`, `5:30 PM` on the same date are excluded. **To find all records on a given date in a DateTime column, you must use a range query, not `=`.**

## Next Action

No re-run needed. DateTime exact match behavior documented. DB-5 category complete.
