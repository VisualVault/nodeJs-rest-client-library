# TC-11-load-PST — Summary

**Spec**: [tc-11-load-PST.md](../test-cases/tc-11-load-PST.md)
**Current status**: FAIL — last run 2026-04-08 (PDT)
**Bug surface**: FORM-BUG-5 (-7h PDT drift)

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-08 | PDT | FAIL    | [run-1](../runs/tc-11-load-PST-run-1.md) |

## Current Interpretation

Bug #5 drift at PDT is -7h per trip (not -8h PST as matrix predicted — DST active for Mar 15). Raw value preserved on cross-TZ load. Matrix prediction corrected. Extends Bug #5 characterization to PDT offset.

## Next Action

No further action — confirms TZ-proportional drift model.
