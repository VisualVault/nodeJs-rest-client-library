# TC-7-D-dateObj — Summary

**Spec**: [tc-7-D-dateObj.md](../test-cases/tc-7-D-dateObj.md)
**Current status**: PASS — verified 2026-04-02 (Layer 2 regression)
**Bug surface**: Bug #5 — GFV adds fake Z (expected)

## Run History

| Run | Date       | TZ  | Outcome | Notes                                      |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| L2  | 2026-04-02 | —   | PASS    | Playwright Layer 2 regression verification |

## Current Interpretation

Config D SetFieldValue with Date object stores correctly. GFV returns with fake Z (Bug #5). Raw value correct.

## Next Action

No further action — behavior characterized.
