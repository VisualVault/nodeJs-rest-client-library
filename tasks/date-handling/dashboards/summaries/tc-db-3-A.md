# TC-DB-3-A — Summary

**Spec**: [tc-db-3-A.md](../test-cases/tc-db-3-A.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: Bug #7 confirmed — wrong date `3/14/2026` visible (intended `3/15/2026`)

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-3-A-run-1.md) |

## Current Interpretation

Bug #7 wrong date (-1 day for UTC+ timezones) propagates to the dashboard unchanged. The server-side formatter reads the corrupted stored value `"2026-03-14T00:00:00Z"` and renders it as `3/14/2026`. No server-side correction is applied.

## Next Action

No re-run needed. Bug #7 dashboard propagation confirmed for Config A.
