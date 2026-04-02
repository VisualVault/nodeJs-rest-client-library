# TC-12-near-midnight-2 — Summary

**Spec**: [tc-12-near-midnight-2.md](../test-cases/tc-12-near-midnight-2.md)
**Current status**: FAIL — verified 2026-04-02 (Layer 2 regression)
**Bug surface**: Bug #5 — near-midnight round-trip -3h drift

## Run History

| Run | Date       | TZ  | Outcome | Notes                                      |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| L2  | 2026-04-02 | —   | FAIL    | Playwright Layer 2 regression verification |

## Current Interpretation

Near-midnight round-trip at 23:00 BRT: -3h drift → 20:00 (stays same day after 1 trip). Day crosses after 8 trips.

## Next Action

No further action — behavior characterized.
