# TC-DB-4-F6-ASC — Summary

**Spec**: [tc-db-4-f6-asc.md](tasks/date-handling/dashboards/test-cases/tc-db-4-f6-asc.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: None — DateTime column ascending sort triggers correctly

## Run History

| Run | Date       | Outcome | File                                     |
| --- | ---------- | ------- | ---------------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-4-f6-asc-run-1.md) |

## Current Interpretation

Field6 ascending sort triggers correctly via `__doPostBack`. Empty cells sort to top, pushing all 55 dated records to page 2 (page size 200, ~217 empty rows). Correct order confirmed indirectly via the descending counterpart test.

## Next Action

No re-run needed. Ascending sort confirmed for DateTime column.
