# TC-DB-1-G — Summary

**Spec**: [tc-db-1-G.md](tasks/date-handling/dashboards/test-cases/tc-db-1-G.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: None — server renders legacy DateTime Config G in correct M/D/YYYY H:MM AM/PM format

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-1-G-run-1.md) |

## Current Interpretation

Field14 (Config G: enableTime=true, ignoreTZ=false, useLegacy=true) displays correctly as `M/D/YYYY H:MM AM/PM` in the dashboard grid. The useLegacy flag has no effect on server-side DateTime display format, identical to Config C.

## Next Action

No re-run needed. Proceed to DB-2 (date accuracy) for Config G.
