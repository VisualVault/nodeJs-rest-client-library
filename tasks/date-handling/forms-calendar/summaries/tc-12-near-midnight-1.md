# TC-12-near-midnight-1 — Summary

**Spec**: [tc-12-near-midnight-1.md](../test-cases/tc-12-near-midnight-1.md)
**Current status**: FAIL — verified 2026-04-02 (Layer 2 regression)
**Bug surface**: Bug #5 — ISO+Z near midnight crosses day in BRT

## Run History

| Run | Date       | TZ  | Outcome | Notes                                      |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| L2  | 2026-04-02 | —   | FAIL    | Playwright Layer 2 regression verification |

## Current Interpretation

ISO+Z input near midnight (00:30 UTC) → BRT Mar 14 21:30. Day crossed on input. Bug #5 fake Z creates double jeopardy.

## Next Action

No further action — behavior characterized.
