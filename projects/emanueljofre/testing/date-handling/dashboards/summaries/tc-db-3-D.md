# TC-DB-3-D — Summary

**Spec**: [tc-db-3-D.md](tasks/date-handling/dashboards/test-cases/tc-db-3-D.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: Bug #5 drift confirmed — `GetFieldValue→SetFieldValue` round-trip shifts time -3h (BRT)

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-3-D-run-1.md) |

## Current Interpretation

Bug #5 fake Z causes the fake UTC suffix to be treated as real UTC. In BRT (UTC-3), one round-trip shifts midnight to 9:00 PM of the previous day — changing the date. Dashboard shows `3/14/2026 9:00 PM` for what should be `3/15/2026 12:00 AM`. After 8 round-trips, a full day is lost.

## Next Action

No re-run needed. Bug #5 drift propagation confirmed for Config D.
