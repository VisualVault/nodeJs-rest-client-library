# TC-DB-2-F — Summary

**Spec**: [tc-db-2-F.md](../test-cases/tc-db-2-F.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: None — server renders stored legacy date-only+ignoreTZ value correctly

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-2-F-run-1.md) |

## Current Interpretation

Field11 (Config F: enableTime=false, ignoreTZ=true, useLegacy=true) dashboard display `3/15/2026` accurately matches the stored value. All 4 date-only configs (A, B, E, F) produce identical output — `ignoreTZ` and `useLegacy` are invisible to the server-side formatter.

## Next Action

No re-run needed. Proceed to DB-3 (wrong date detection) for Config F.
