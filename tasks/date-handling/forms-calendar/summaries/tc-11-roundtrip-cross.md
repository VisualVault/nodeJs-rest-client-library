# TC-11-roundtrip-cross — Summary

**Spec**: [tc-11-roundtrip-cross.md](../test-cases/tc-11-roundtrip-cross.md)
**Current status**: FAIL — last run 2026-04-08 (IST+BRT)
**Bug surface**: FORM-BUG-5 (compound cross-TZ drift)

## Run History

| Run | Date       | TZ      | Outcome | File                                            |
| --- | ---------- | ------- | ------- | ----------------------------------------------- |
| 1   | 2026-04-08 | IST+BRT | FAIL    | [run-1](../runs/tc-11-roundtrip-cross-run-1.md) |

## Current Interpretation

Compound Bug #5 drift confirmed across TZ boundaries. IST round-trip (+5:30h) followed by BRT round-trip (-3h) produces net +2:30h shift from original midnight. This is the worst-case multi-user scenario — data silently corrupts as different TZ users interact with the same record. Fix requires eliminating fake Z from GFV.

## Next Action

No further action — FAIL confirmed. Feeds into fix priority assessment.
