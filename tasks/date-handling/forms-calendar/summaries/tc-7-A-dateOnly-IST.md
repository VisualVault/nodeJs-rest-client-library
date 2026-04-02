# TC-7-A-dateOnly-IST — Summary

**Spec**: [tc-7-A-dateOnly-IST.md](../test-cases/tc-7-A-dateOnly-IST.md)
**Current status**: FAIL — verified 2026-04-02 (Layer 2 regression)
**Bug surface**: Bug #7 — date shifts -1 day in IST

## Run History

| Run | Date       | TZ  | Outcome | Notes                                      |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| L2  | 2026-04-02 | —   | FAIL    | Playwright Layer 2 regression verification |

## Current Interpretation

Config A SetFieldValue with date-only string in IST: Bug #7 causes -1 day shift. Input 03/15/2026 stores as 2026-03-14.

## Next Action

No further action — behavior characterized.
