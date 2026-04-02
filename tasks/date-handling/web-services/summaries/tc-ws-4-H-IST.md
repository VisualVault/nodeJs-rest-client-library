# TC-WS-4-H-IST — Summary

**Run file**: [ws-4-batch-run-1.md](../runs/ws-4-batch-run-1.md)
**Current status**: FAIL — last run 2026-04-02 (IST)
**Hypothesis**: H-6 — API-set dates display correctly in BRT but may show Bug #7 in IST

## Run History

| Run | Date       | TZ  | Outcome | File                                       |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| 1   | 2026-04-02 | IST | FAIL    | [batch-run-1](../runs/ws-4-batch-run-1.md) |

## Current Interpretation

Config H (legacy DateTime, ignoreTZ=true) behaves like D but without Bug #5 fake Z. rawValue still shifted by TZ offset.

## Next Action

Document as part of CB-8 cross-layer issue.
