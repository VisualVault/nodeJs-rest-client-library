# TC-DB-3-G — Summary

**Spec**: [tc-db-3-G.md](../test-cases/tc-db-3-G.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: Legacy popup UTC storage confirmed — IST midnight renders as wrong day/time

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-3-G-run-1.md) |

## Current Interpretation

Legacy popup stores `toISOString()` directly, producing `"2026-03-14T18:30:00.000Z"` for IST midnight on March 15. Dashboard renders this UTC value as `3/14/2026 6:30 PM` — wrong day AND misleading time. This is documented in Forms IST testing (TC-1-G-IST FAIL-1).

## Next Action

No re-run needed. Legacy UTC storage propagation confirmed for Config G.
