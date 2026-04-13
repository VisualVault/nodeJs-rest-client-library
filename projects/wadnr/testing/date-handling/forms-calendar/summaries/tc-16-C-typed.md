# TC-16-C-typed — Summary

**Spec**: [tc-16-C-typed.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-16-C-typed.md)
**Current status**: PASS — last run 2026-04-13 (BRT) — cross-env confirmed
**Bug surface**: none

## Run History

| Run | Date | TZ | Outcome | File |
|---|---|---|---|---|
| 1 | 2026-04-13 | BRT | PARTIAL (vv5dev) | [run-1](../runs/tc-16-C-typed-run-1.md) |
| 2 | 2026-04-13 | BRT | PASS (vvdemo) | [emanueljofre run-1](../../../../projects/emanueljofre/testing/date-handling/forms-calendar/runs/tc-16-C-typed-run-1.md) |

## Current Interpretation

Cross-env comparison complete. On vv5dev (server PDT, UTC-7) and vvdemo (server BRT, UTC-3), Config C DateTime typed input produces identical API responses: field6=`"2026-03-15T00:00:00Z"`. The save pipeline strips timezone and appends Z uniformly regardless of server timezone. Server TZ does not affect the form save pipeline for Config C.

## Next Action

Complete — server TZ confirmed irrelevant.
