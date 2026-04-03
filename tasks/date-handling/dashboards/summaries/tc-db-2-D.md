# TC-DB-2-D — Summary

**Spec**: [tc-db-2-D.md](../test-cases/tc-db-2-D.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: None — server renders stored DateTime+ignoreTZ value correctly

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-2-D-run-1.md) |

## Current Interpretation

Field5 (Config D: enableTime=true, ignoreTZ=true, useLegacy=false) dashboard display `3/15/2026 2:30 PM` accurately matches the stored value. The `ignoreTZ` flag has no effect on server-side rendering — identical to Config C. Bug #5 (fake Z) and Bug #6 (Invalid Date) are client-side only and do not affect stored values or dashboard display for API-written records.

## Next Action

No re-run needed. Proceed to DB-3 (wrong date detection) for Config D.
