# TC-7-A-epoch — Summary

**Spec**: [tc-7-A-epoch.md](../test-cases/tc-7-A-epoch.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — BRT control for Unix epoch input

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-7-A-epoch-run-1.md) |

## Current Interpretation

Unix epoch `1773543600000` (BRT midnight March 15, 2026) is the most unambiguous input format. Stores `"2026-03-15"` correctly. Epoch bypasses string parsing ambiguity entirely. Completes the full Config A BRT format matrix — all 7 formats produce identical results.

## Next Action

No further action — closed PASS.
