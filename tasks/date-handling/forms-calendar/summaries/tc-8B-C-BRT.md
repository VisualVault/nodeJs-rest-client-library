# TC-8B-C-BRT — Summary

**Spec**: [tc-8B-C-BRT.md](../test-cases/tc-8B-C-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Chromium)
**Bug surface**: none — Config C GDOC and GFV agree on real UTC

## Run History

| Run | Date       | TZ  | Outcome | File                                  |
| --- | ---------- | --- | ------- | ------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-8B-C-BRT-run-1.md) |

## Current Interpretation

Config C is the only config where GDOC.toISOString() and GFV produce identical output. Both return real UTC.

## Next Action

No further action — behavior characterized.
