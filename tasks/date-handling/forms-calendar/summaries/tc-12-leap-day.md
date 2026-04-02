# TC-12-leap-day — Summary

**Spec**: [tc-12-leap-day.md](../test-cases/tc-12-leap-day.md)
**Current status**: FAIL — verified 2026-04-02 (Layer 2 regression)
**Bug surface**: Bug #5 — leap day lost in 1 trip (CRITICAL)

## Run History

| Run | Date       | TZ  | Outcome | Notes                                      |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| L2  | 2026-04-02 | —   | FAIL    | Playwright Layer 2 regression verification |

## Current Interpretation

Feb 29 midnight BRT: -3h drift → Feb 28 21:00. Leap day permanently lost in single round-trip.

## Next Action

No further action — behavior characterized.
