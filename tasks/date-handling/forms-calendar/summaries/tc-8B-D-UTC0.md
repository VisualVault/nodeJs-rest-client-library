# TC-8B-D-UTC0 — Summary

**Spec**: [tc-8B-D-UTC0.md](../test-cases/tc-8B-D-UTC0.md)
**Current status**: PASS — last run 2026-04-03 (UTC0, Chromium)
**Bug surface**: Bug #5 invisible at UTC+0

## Run History

| Run | Date       | TZ   | Outcome | File                                   |
| --- | ---------- | ---- | ------- | -------------------------------------- |
| 1   | 2026-04-03 | UTC0 | PASS    | [run-1](../runs/tc-8B-D-UTC0-run-1.md) |

## Current Interpretation

Config D GDOC at UTC+0. GDOC.toISOString() and GFV fake Z produce identical output. Bug #5 numerically invisible. Completes Config D GDOC 3-TZ spectrum.

## Next Action

No further action — behavior characterized.
