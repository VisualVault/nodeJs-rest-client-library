# TC-8-E — Summary

**Spec**: [tc-8-E.md](../test-cases/tc-8-E.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Chromium)
**Bug surface**: none — legacy date-only returns raw unchanged

## Run History

| Run | Date       | TZ  | Outcome | File                             |
| --- | ---------- | --- | ------- | -------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-8-E-run-1.md) |

## Current Interpretation

Legacy date-only Config E GFV returns raw string unchanged. Identical to non-legacy Config A. The `useLegacy` flag is inert for date-only GFV.

## Next Action

No further action — behavior characterized.
