# TC-16-D-controls — Summary

**Spec**: [tc-16-D-controls.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-16-D-controls.md)
**Current status**: PASS (FAIL-3 Bug #5) — last run 2026-04-13 (BRT) — cross-env confirmed
**Bug surface**: FORM-BUG-5 (fake Z in client GetFieldValue)

## Run History

| Run | Date | TZ | Outcome | File |
|---|---|---|---|---|
| 1 | 2026-04-13 | BRT | PARTIAL (FAIL-3 Bug #5, vv5dev) | [run-1](../runs/tc-16-D-controls-run-1.md) |
| 2 | 2026-04-13 | BRT | PASS (FAIL-3 Bug #5, vvdemo) | [emanueljofre run-1](../../../../projects/emanueljofre/testing/date-handling/forms-calendar/runs/tc-16-D-controls-run-1.md) |

## Current Interpretation

Cross-env comparison complete. On vv5dev (server PDT, UTC-7) and vvdemo (server BRT, UTC-3), Config D DateTime+iTZ reload produces identical values: raw=`"2026-03-15T14:30:00"`, api=`"2026-03-15T14:30:00.000Z"`. FORM-BUG-5 (fake Z) is consistent across both environments — client-side bug independent of server timezone. The form load pipeline does not mutate ignoreTimezone=true values regardless of server timezone. Server TZ does not affect the form load path for Config D.

## Next Action

Complete — server TZ confirmed irrelevant.
