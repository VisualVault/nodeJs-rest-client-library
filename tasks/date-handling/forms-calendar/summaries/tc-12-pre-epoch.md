# TC-12-pre-epoch — Summary

**Spec**: [tc-12-pre-epoch.md](../test-cases/tc-12-pre-epoch.md)
**Current status**: PASS — verified 2026-04-02 (Layer 2 regression)
**Bug surface**: Bug #5 — standard -3h drift on pre-epoch date

## Run History

| Run | Date       | TZ  | Outcome | Notes                                      |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| L2  | 2026-04-02 | —   | PASS    | Playwright Layer 2 regression verification |

## Current Interpretation

Pre-Unix-epoch date (1969-12-31): standard -3h drift. Negative epoch handled correctly by JS Date.

## Next Action

No further action — behavior characterized.
