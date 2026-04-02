# TC-8-D-IST — Summary

**Spec**: [tc-8-D-IST.md](../test-cases/tc-8-D-IST.md)
**Current status**: FAIL — verified 2026-04-02 (Layer 2 regression)
**Bug surface**: Bug #5 — GFV returns fake Z (TZ-invariant)

## Run History

| Run | Date       | TZ  | Outcome | Notes                                      |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| L2  | 2026-04-02 | —   | FAIL    | Playwright Layer 2 regression verification |

## Current Interpretation

Config D GetFieldValue in IST returns same fake Z as BRT. Bug #5 is TZ-invariant.

## Next Action

No further action — behavior characterized.
