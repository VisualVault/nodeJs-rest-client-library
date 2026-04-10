# TC-DB-6-G — Summary

**Spec**: [tc-db-6-G.md](tasks/date-handling/dashboards/test-cases/tc-db-6-G.md)
**Current status**: FAIL-2 — last run 2026-04-02
**Bug surface**: Time shift — dashboard UTC vs form BRT, identical to Config C

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | FAIL-2  | [run-1](../runs/tc-db-6-G-run-1.md) |

## Current Interpretation

Legacy DateTime with ignoreTZ=false: same UTC→BRT time shift as non-legacy Config C. `useLegacy=true` does not change the cross-layer behavior. GFV does NOT have fake Z (legacy path skips Bug #5).

## Next Action

No re-run needed.
