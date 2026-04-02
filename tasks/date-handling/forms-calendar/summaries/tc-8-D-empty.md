# TC-8-D-empty — Summary

**Spec**: [tc-8-D-empty.md](../test-cases/tc-8-D-empty.md)
**Current status**: FAIL — verified 2026-04-02 (Layer 2 regression)
**Bug surface**: Bug #6 — GFV returns 'Invalid Date' for empty field

## Run History

| Run | Date       | TZ  | Outcome | Notes                                      |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| L2  | 2026-04-02 | —   | FAIL    | Playwright Layer 2 regression verification |

## Current Interpretation

Config D GetFieldValue on empty field returns truthy string 'Invalid Date' instead of empty string. Bug #6 confirmed.

## Next Action

No further action — behavior characterized.
