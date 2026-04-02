# TC-WS-9-A-locale-BRT — Summary

**Run file**: [ws-9-batch-run-1.md](../runs/ws-9-batch-run-1.md)
**Current status**: FAIL — last run 2026-04-02
**Hypothesis**: H-11/H-12 — Date object serialization and TZ behavior

## Run History

| Run | Date       | Outcome | File                                       |
| --- | ---------- | ------- | ------------------------------------------ |
| 1   | 2026-04-02 | FAIL    | [batch-run-1](../runs/ws-9-batch-run-1.md) |

## Current Interpretation

toLocaleDateString in BRT: returns Mar 14 (wrong!) for UTC midnight Mar 15. CB-27.

## Next Action

No further action — confirmed.
