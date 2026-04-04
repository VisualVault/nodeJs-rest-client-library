# TC-8B-H-BRT — Summary

**Spec**: [tc-8B-H-BRT.md](../test-cases/tc-8B-H-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Chromium)
**Bug surface**: none — legacy DateTime GDOC correct

## Run History

| Run | Date       | TZ  | Outcome | File                                  |
| --- | ---------- | --- | ------- | ------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-8B-H-BRT-run-1.md) |

## Current Interpretation

Config H GDOC returns correct Date. toISOString gives real UTC. GFV returns raw (useLegacy bypasses Bug #5). Both APIs correct for Config H.

## Next Action

No further action — behavior characterized.
