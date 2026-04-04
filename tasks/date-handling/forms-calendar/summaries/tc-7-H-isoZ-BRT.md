# TC-7-H-isoZ-BRT — Summary

**Spec**: [tc-7-H-isoZ-BRT.md](../test-cases/tc-7-H-isoZ-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — no fake Z, useLegacy protects from Bug #5

## Run History

| Run | Date       | TZ  | Outcome | File                                      |
| --- | ---------- | --- | ------- | ----------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-7-H-isoZ-BRT-run-1.md) |

## Current Interpretation

Config H legacy DateTime+ignoreTZ with isoZ input stores correctly in BRT. Same UTC→local shift as D-isoZ but GFV returns raw without fake Z. `useLegacy=true` protects from Bug #5 drift on round-trips.

## Next Action

No further action — closed PASS.
