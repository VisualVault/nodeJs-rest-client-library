# TC-DB-6-H — Summary

**Spec**: [tc-db-6-H.md](tasks/date-handling/dashboards/test-cases/tc-db-6-H.md)
**Current status**: FAIL-1 — last run 2026-04-02
**Bug surface**: Format mismatch only — ignoreTZ preserves time (like Config D)

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | FAIL-1  | [run-1](../runs/tc-db-6-H-run-1.md) |

## Current Interpretation

Legacy DateTime with ignoreTZ=true: display time matches (2:30 PM), format has leading zeros. Same pattern as non-legacy Config D, but without Bug #5 fake Z in GFV. DB-6 complete: all 8 configs show cross-layer discrepancy.

## Next Action

No re-run needed. DB-6 category complete.
