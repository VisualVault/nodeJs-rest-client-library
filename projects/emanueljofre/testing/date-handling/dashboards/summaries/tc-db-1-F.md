# TC-DB-1-F — Summary

**Spec**: [tc-db-1-F.md](tasks/date-handling/dashboards/test-cases/tc-db-1-F.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: None — server renders legacy date-only + ignoreTZ Config F in correct M/D/YYYY format

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-1-F-run-1.md) |

## Current Interpretation

Field11 (Config F: enableTime=false, ignoreTZ=true, useLegacy=true) displays correctly as `M/D/YYYY` in the dashboard grid. Neither useLegacy nor ignoreTZ affects the server-side display format.

## Next Action

No re-run needed. Proceed to DB-2 (date accuracy) for Config F.
