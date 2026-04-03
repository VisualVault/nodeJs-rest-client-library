# TC-6-B-BRT — Summary

**Spec**: [tc-6-B-BRT.md](../test-cases/tc-6-B-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — ignoreTZ inert on current date path

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-6-B-BRT-run-1.md) |

## Current Interpretation

Config B Current Date correct in BRT. `new Date()` init path bypasses all timezone-sensitive parsing. `ignoreTimezone=true` has no effect — identical to 6-A-BRT.

## Next Action

Test 6-B-IST when expanding IST coverage.
