# TC-12-year-boundary — Summary

**Spec**: [tc-12-year-boundary.md](../test-cases/tc-12-year-boundary.md)
**Current status**: FAIL — verified 2026-04-02 (Layer 2 regression)
**Bug surface**: Bug #5 — year boundary crossed in 1 trip (CRITICAL)

## Run History

| Run | Date       | TZ  | Outcome | Notes                                      |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| L2  | 2026-04-02 | —   | FAIL    | Playwright Layer 2 regression verification |

## Current Interpretation

Jan 1 midnight BRT: -3h drift → Dec 31 2025 21:00. Year boundary crossed in single round-trip. Most severe Bug #5 manifestation.

## Next Action

No further action — behavior characterized.
