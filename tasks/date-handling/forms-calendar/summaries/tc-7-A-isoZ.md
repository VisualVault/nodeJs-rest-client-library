# TC-7-A-isoZ — Summary

**Spec**: [tc-7-A-isoZ.md](../test-cases/tc-7-A-isoZ.md)
**Current status**: PASS — verified 2026-04-02 (Layer 2 regression)
**Bug surface**: none — ISO+Z stripped to date-only

## Run History

| Run | Date       | TZ  | Outcome | Notes                                      |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| L2  | 2026-04-02 | —   | PASS    | Playwright Layer 2 regression verification |

## Current Interpretation

Config A SetFieldValue with ISO+Z input: time/Z stripped, date preserved. GFV returns date-only string.

## Next Action

No further action — behavior characterized.
