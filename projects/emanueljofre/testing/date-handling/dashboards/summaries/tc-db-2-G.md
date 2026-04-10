# TC-DB-2-G — Summary

**Spec**: [tc-db-2-G.md](tasks/date-handling/dashboards/test-cases/tc-db-2-G.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: None — server renders stored legacy DateTime value correctly

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-2-G-run-1.md) |

## Current Interpretation

Field14 (Config G: enableTime=true, ignoreTZ=false, useLegacy=true) dashboard display `3/15/2026 2:30 PM` accurately matches the stored value. `useLegacy` has no effect on server-side DateTime rendering — identical to Config C.

## Next Action

No re-run needed. Proceed to DB-3 (wrong date detection) for Config G.
