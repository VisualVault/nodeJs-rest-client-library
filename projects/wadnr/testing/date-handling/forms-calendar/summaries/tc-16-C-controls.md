# TC-16-C-controls — Summary

**Spec**: [tc-16-C-controls.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-16-C-controls.md)
**Current status**: PASS — last run 2026-04-13 (BRT) — cross-env confirmed
**Bug surface**: none

## Run History

| Run | Date | TZ | Outcome | File |
|---|---|---|---|---|
| 1 | 2026-04-13 | BRT | PARTIAL (vv5dev) | [run-1](../runs/tc-16-C-controls-run-1.md) |
| 2 | 2026-04-13 | BRT | PASS (vvdemo) | [emanueljofre run-1](../../../../projects/emanueljofre/testing/date-handling/forms-calendar/runs/tc-16-C-controls-run-1.md) |

## Current Interpretation

Cross-env comparison complete. On vv5dev (server PDT, UTC-7) and vvdemo (server BRT, UTC-3), Config C DateTime reload produces identical values: raw=`"2026-03-15T00:00:00"`, api=`"2026-03-15T03:00:00.000Z"`. The form load pipeline does not mutate DateTime values regardless of server timezone. GetFieldValue BRT->UTC conversion is consistent across both servers. Server TZ does not affect the form load path for Config C.

## Next Action

Complete — server TZ confirmed irrelevant.
