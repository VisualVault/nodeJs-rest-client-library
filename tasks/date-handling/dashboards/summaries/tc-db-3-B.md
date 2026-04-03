# TC-DB-3-B — Summary

**Spec**: [tc-db-3-B.md](../test-cases/tc-db-3-B.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: Bug #7 confirmed — `ignoreTZ=true` provides no protection

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-3-B-run-1.md) |

## Current Interpretation

Bug #7 affects Config B identically to Config A. The `ignoreTZ=true` flag has no effect on the date-only storage path where Bug #7 fires.

## Next Action

No re-run needed. Bug #7 propagation confirmed for Config B.
