# TC-DB-3-E — Summary

**Spec**: [tc-db-3-E.md](tasks/date-handling/dashboards/test-cases/tc-db-3-E.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: Bug #7 confirmed — legacy date-only affected identically to non-legacy

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-3-E-run-1.md) |

## Current Interpretation

Legacy Config E shows the same Bug #7 wrong date as non-legacy Config A. The `useLegacy` flag does not change the date-only storage behavior in `normalizeCalValue()`.

## Next Action

No re-run needed. Bug #7 propagation confirmed for Config E.
