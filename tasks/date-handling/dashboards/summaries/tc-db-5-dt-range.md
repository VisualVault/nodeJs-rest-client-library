# TC-DB-5-DT-RANGE — Summary

**Spec**: [tc-db-5-dt-range.md](../test-cases/tc-db-5-dt-range.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: None — DateTime range filter captures all time variants correctly

## Run History

| Run | Date       | Outcome | File                                       |
| --- | ---------- | ------- | ------------------------------------------ |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-5-dt-range-run-1.md) |

## Current Interpretation

SQL range `Field5 >= '3/14/2026' AND Field5 <= '3/15/2026 11:59 PM'` correctly returns 50 records spanning all times in the 2-day window. Bug #5 drifted value (9:00 PM on 3/14) is captured. The explicit `11:59 PM` upper bound is necessary — using `<= '3/15/2026'` alone would only match midnight records (same as db-5-dt-exact behavior).

## Next Action

No re-run needed. DB-5 category complete.
