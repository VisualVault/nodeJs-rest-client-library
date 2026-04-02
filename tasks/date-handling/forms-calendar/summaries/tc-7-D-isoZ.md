# TC-7-D-isoZ — Summary

**Spec**: [tc-7-D-isoZ.md](../test-cases/tc-7-D-isoZ.md)
**Current status**: FAIL — verified 2026-04-02 (Layer 2 regression)
**Bug surface**: Bug #5 — ISO+Z input shifts day in BRT (-3h)

## Run History

| Run | Date       | TZ  | Outcome | Notes                                      |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| L2  | 2026-04-02 | —   | FAIL    | Playwright Layer 2 regression verification |

## Current Interpretation

Config D SetFieldValue with ISO+Z input: UTC midnight interpreted as BRT local → stored as previous day. Bug #5 fake Z on GFV.

## Next Action

No further action — behavior characterized.
