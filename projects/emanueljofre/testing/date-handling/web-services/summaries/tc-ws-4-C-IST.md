# TC-WS-4-C-IST — Summary

**Run file**: [ws-4-batch-run-1.md](../runs/ws-4-batch-run-1.md)
**Current status**: FAIL — last run 2026-04-02 (IST)
**Hypothesis**: H-6 — API-set dates display correctly in BRT but may show Bug #7 in IST

## Run History

| Run | Date       | TZ  | Outcome | File                                       |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| 1   | 2026-04-02 | IST | FAIL    | [batch-run-1](../runs/ws-4-batch-run-1.md) |

## Current Interpretation

Config C (DateTime, ignoreTZ=false) shows UTC→local time shift. API-stored Z suffix causes Forms V1 to convert 14:30 UTC to local time. New finding CB-8.

## Next Action

Document as cross-layer design issue.
