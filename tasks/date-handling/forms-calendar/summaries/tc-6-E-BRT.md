# TC-6-E-BRT — Summary

**Spec**: [tc-6-E-BRT.md](../test-cases/tc-6-E-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — legacy date-only identical to non-legacy

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-6-E-BRT-run-1.md) |

## Current Interpretation

Config E legacy date-only Current Date correct in BRT. The `new Date()` init path bypasses all legacy-specific code paths. Behavior is identical to non-legacy Config A (6-A-BRT). GFV returns the raw Date object unchanged.

## Next Action

Test 6-E-IST when expanding IST coverage for legacy configs.
