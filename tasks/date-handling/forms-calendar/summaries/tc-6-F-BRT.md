# TC-6-F-BRT — Summary

**Spec**: [tc-6-F-BRT.md](../test-cases/tc-6-F-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — ignoreTZ inert on current date path

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-6-F-BRT-run-1.md) |

## Current Interpretation

Config F legacy date-only + ignoreTZ Current Date correct in BRT. `ignoreTimezone=true` has no effect — the `new Date()` init path bypasses all timezone-sensitive parsing. Identical to 6-E-BRT.

## Next Action

Test 6-F-IST when expanding IST coverage for legacy configs.
