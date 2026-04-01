# TC-3-B-BRT-IST — Summary

**Spec**: [tc-3-B-BRT-IST.md](../test-cases/tc-3-B-BRT-IST.md)
**Current status**: PASS — last run 2026-04-01 (IST)
**Bug surface**: none — control/passing scenario

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-01 | IST | PASS    | [run-1](../runs/tc-3-B-BRT-IST-run-1.md) |

## Current Interpretation

Config B (`enableTime=false, ignoreTimezone=true`) date-only field survives cross-TZ reload from BRT to IST without shift, identical to Config A (tc-3-A-BRT-IST). The `ignoreTimezone` flag is inert for date-only fields. The form load path does not re-parse date-only strings through a Date constructor, so Bug #7 does not fire on reload — the stored string `"2026-03-15"` passes through unchanged regardless of the tester's timezone.

## Next Action

Run 3-B-IST-BRT to verify reverse cross-TZ behavior. No further action needed for BRT→IST — closed PASS.
