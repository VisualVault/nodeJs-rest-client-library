# TC-WS-9-A-us-BRT — Summary

**Run file**: [ws-9-batch-run-1.md](../runs/ws-9-batch-run-1.md)
**Current status**: FAIL — last run 2026-04-02
**Hypothesis**: H-11/H-12 — Date object serialization and TZ behavior

## Run History

| Run | Date       | Outcome | File                                       |
| --- | ---------- | ------- | ------------------------------------------ |
| 1   | 2026-04-02 | FAIL    | [batch-run-1](../runs/ws-9-batch-run-1.md) |

## Current Interpretation

new Date(US) in BRT: local midnight = T03:00Z, time leaks into date-only field.

## Next Action

No further action — confirmed.
