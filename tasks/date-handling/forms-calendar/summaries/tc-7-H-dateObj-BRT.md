# TC-7-H-dateObj-BRT — Summary

**Spec**: [tc-7-H-dateObj-BRT.md](../test-cases/tc-7-H-dateObj-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — no fake Z, useLegacy protects from Bug #5

## Run History

| Run | Date       | TZ  | Outcome | File                                         |
| --- | ---------- | --- | ------- | -------------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-7-H-dateObj-BRT-run-1.md) |

## Current Interpretation

Config H legacy DateTime+ignoreTZ with Date object input stores correctly in BRT. Date object stores local midnight. No fake Z on GFV output. Compare Config D dateObj which adds fake Z (Bug #5) causing progressive drift.

## Next Action

No further action — closed PASS.
