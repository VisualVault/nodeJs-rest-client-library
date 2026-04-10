# TC-DB-2-H — Summary

**Spec**: [tc-db-2-H.md](tasks/date-handling/dashboards/test-cases/tc-db-2-H.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: None — server renders stored legacy DateTime+ignoreTZ value correctly

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-2-H-run-1.md) |

## Current Interpretation

Field13 (Config H: enableTime=true, ignoreTZ=true, useLegacy=true) dashboard display `3/15/2026 2:30 PM` accurately matches the stored value. All 4 DateTime configs (C, D, G, H) produce identical output — `ignoreTZ` and `useLegacy` are invisible to the server-side formatter. DB-2 complete: the dashboard is a reliable read-only view of database content.

## Next Action

No re-run needed. DB-2 category complete. Next: DB-3 (wrong date detection).
