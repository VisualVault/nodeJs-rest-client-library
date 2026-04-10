# TC-DB-2-C — Summary

**Spec**: [tc-db-2-C.md](tasks/date-handling/dashboards/test-cases/tc-db-2-C.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: None — server renders stored DateTime UTC value directly

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-2-C-run-1.md) |

## Current Interpretation

Field6 (Config C: enableTime=true, ignoreTZ=false, useLegacy=false) dashboard display `3/15/2026 2:30 PM` accurately matches the stored value `2026-03-15T14:30:00Z`. The server renders UTC time directly without timezone conversion. Note: Forms Angular SPA would show this as local time (e.g., `11:30 AM` BRT) — that cross-layer discrepancy is a DB-6 concern.

## Next Action

No re-run needed. Proceed to DB-3 (wrong date detection) for Config C.
