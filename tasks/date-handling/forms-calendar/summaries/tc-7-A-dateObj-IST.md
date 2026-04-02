# TC-7-A-dateObj-IST — Summary

**Spec**: [tc-7-A-dateObj-IST.md](../test-cases/tc-7-A-dateObj-IST.md)
**Current status**: FAIL — verified 2026-04-02 (Layer 2 regression)
**Bug surface**: Bug #7 — Date object shifts -2 days in IST

## Run History

| Run | Date       | TZ  | Outcome | Notes                                      |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| L2  | 2026-04-02 | —   | FAIL    | Playwright Layer 2 regression verification |

## Current Interpretation

Config A SetFieldValue with Date object in IST: Bug #7 double-shift causes -2 days. Input Mar 15 stores as 2026-03-13.

## Next Action

No further action — behavior characterized.
