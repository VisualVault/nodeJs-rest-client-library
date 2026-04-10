# TC-9-E-any — Summary

**Spec**: [tc-9-E-any.md](tasks/date-handling/forms-calendar/test-cases/tc-9-E-any.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Chromium)
**Bug surface**: None — legacy date-only immune to Bug #5

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-9-E-any-run-1.md) |

## Current Interpretation

Legacy date-only Config E is immune to Bug #5. enableTime=false prevents the fake Z suffix from being appended, so GFV returns a plain date string that survives round-trips without drift. Same behavior as Config A/B in BRT.

## Next Action

No further action.
