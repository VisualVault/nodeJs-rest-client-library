# TC-DB-1-H — Summary

**Spec**: [tc-db-1-H.md](tasks/date-handling/dashboards/test-cases/tc-db-1-H.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: None — server renders legacy DateTime + ignoreTZ Config H in correct M/D/YYYY H:MM AM/PM format

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-1-H-run-1.md) |

## Current Interpretation

Field13 (Config H: enableTime=true, ignoreTZ=true, useLegacy=true) displays correctly as `M/D/YYYY H:MM AM/PM` in the dashboard grid. Neither useLegacy nor ignoreTZ affects the server-side DateTime format. This completes DB-1: **all 8 configs confirmed — the server format is determined solely by the enableTime flag**.

## Next Action

No re-run needed. DB-1 category complete. Proceed to DB-2 (date accuracy).
