# TC-7-C-isoZ — Summary

**Spec**: [tc-7-C-isoZ.md](../test-cases/tc-7-C-isoZ.md)
**Current status**: FAIL — verified 2026-04-02 (Layer 2 regression)
**Bug surface**: correct UTC conversion — ISO+Z shifts to BRT local

## Run History

| Run | Date       | TZ  | Outcome | Notes                                      |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| L2  | 2026-04-02 | —   | FAIL    | Playwright Layer 2 regression verification |

## Current Interpretation

Config C SetFieldValue with ISO+Z: UTC midnight → BRT local (21:00 previous day). This is correct UTC behavior, not a bug. GFV returns real UTC.

## Next Action

No further action — behavior characterized.
