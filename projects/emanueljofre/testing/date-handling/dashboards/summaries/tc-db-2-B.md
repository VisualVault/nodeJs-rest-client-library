# TC-DB-2-B — Summary

**Spec**: [tc-db-2-B.md](tasks/date-handling/dashboards/test-cases/tc-db-2-B.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: None — server renders stored date-only+ignoreTZ value correctly

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-2-B-run-1.md) |

## Current Interpretation

Field10 (Config B: enableTime=false, ignoreTZ=true, useLegacy=false) dashboard display `3/15/2026` accurately matches the stored value. The `ignoreTZ` flag has no effect on server-side rendering — behavior identical to Config A.

## Next Action

No re-run needed. Proceed to DB-3 (wrong date detection) for Config B.
