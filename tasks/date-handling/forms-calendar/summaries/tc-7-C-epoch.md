# TC-7-C-epoch — Summary

**Spec**: [tc-7-C-epoch.md](../test-cases/tc-7-C-epoch.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Chromium)
**Bug surface**: none — Config C control, epoch milliseconds input

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-7-C-epoch-run-1.md) |

## Current Interpretation

Epoch `1773543600000` (BRT midnight = 2026-03-15T03:00:00Z) is unambiguous — no string parsing involved. Stored as local midnight, GFV returns real UTC. Most reliable input format for Config C.

## Next Action

No further action — behavior characterized.
