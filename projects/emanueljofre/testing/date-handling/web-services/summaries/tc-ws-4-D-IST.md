# TC-WS-4-D-IST — Summary

**Run file**: [ws-4-batch-run-1.md](../runs/ws-4-batch-run-1.md)
**Current status**: FAIL — last run 2026-04-02 (IST)
**Hypothesis**: H-6 — API-set dates display correctly in BRT but may show Bug #7 in IST

## Run History

| Run | Date       | TZ  | Outcome | File                                       |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| 1   | 2026-04-02 | IST | FAIL    | [batch-run-1](../runs/ws-4-batch-run-1.md) |

## Current Interpretation

Config D (DateTime, ignoreTZ=true) rawValue shifted like C, but display preserved at 2:30 PM. GetFieldValue adds Bug #5 fake Z to shifted time — doubly misleading.

## Next Action

Document compound effect of CB-8 + Bug #5.
