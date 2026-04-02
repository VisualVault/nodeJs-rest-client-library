# TC-8-D-BRT — Summary

**Spec**: [tc-8-D-BRT.md](../test-cases/tc-8-D-BRT.md)
**Current status**: FAIL — verified 2026-04-02 (Layer 2 regression)
**Bug surface**: Bug #5 — GFV returns fake Z

## Run History

| Run | Date       | TZ  | Outcome | Notes                                      |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| L2  | 2026-04-02 | —   | FAIL    | Playwright Layer 2 regression verification |

## Current Interpretation

Config D GetFieldValue in BRT returns stored value with fake .000Z appended. Bug #5 confirmed.

## Next Action

No further action — behavior characterized.
