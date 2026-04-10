# TC-DB-5-RANGE — Summary

**Spec**: [tc-db-5-range.md](tasks/date-handling/dashboards/test-cases/tc-db-5-range.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: None — SQL range correctly captures Bug #7 shifted dates

## Run History

| Run | Date       | Outcome | File                                    |
| --- | ---------- | ------- | --------------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-5-range-run-1.md) |

## Current Interpretation

SQL range `>= '3/14' AND <= '3/15'` returns 85 records: 66 correct (3/15) + 19 Bug #7 shifted (3/14). Range boundaries are inclusive. This pattern is useful for finding all records associated with a target date including Bug #7 corruption.

## Next Action

No re-run needed. Date range filter confirmed for date-only column.
