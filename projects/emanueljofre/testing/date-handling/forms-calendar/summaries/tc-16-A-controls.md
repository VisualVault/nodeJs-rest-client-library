# TC-16-A-controls — Summary

**Spec**: [tc-16-A-controls.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-16-A-controls.md)
**Current status**: PASS — last run 2026-04-13 (BRT) — cross-env confirmed
**Bug surface**: none

## Run History

| Run | Date | TZ | Outcome | File |
|---|---|---|---|---|
| 1 | 2026-04-13 | BRT | PASS (vvdemo) | [run-1](../runs/tc-16-A-controls-run-1.md) |

## Current Interpretation

Cross-env comparison complete. On vv5dev (server PDT, UTC-7) and vvdemo (server BRT, UTC-3), Config A date-only reload produces identical values: raw=`"2026-03-15"`, api=`"2026-03-15"`. The form load pipeline does not mutate date-only values regardless of server timezone. Server TZ does not affect the form load path for Config A.

## Next Action

Complete — server TZ confirmed irrelevant.
