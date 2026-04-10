# TC-DB-3-F — Summary

**Spec**: [tc-db-3-F.md](tasks/date-handling/dashboards/test-cases/tc-db-3-F.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: Bug #7 confirmed — both flags inert for date-only fields

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-3-F-run-1.md) |

## Current Interpretation

Config F (ignoreTZ=true + useLegacy=true) shows identical Bug #7 behavior. Neither flag affects date-only storage. All 4 date-only configs are equally vulnerable.

## Next Action

No re-run needed. Bug #7 propagation confirmed for Config F.
