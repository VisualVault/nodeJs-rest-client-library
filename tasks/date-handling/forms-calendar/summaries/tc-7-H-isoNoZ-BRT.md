# TC-7-H-isoNoZ-BRT — Summary

**Spec**: [tc-7-H-isoNoZ-BRT.md](../test-cases/tc-7-H-isoNoZ-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — no fake Z, useLegacy protects from Bug #5

## Run History

| Run | Date       | TZ  | Outcome | File                                        |
| --- | ---------- | --- | ------- | ------------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-7-H-isoNoZ-BRT-run-1.md) |

## Current Interpretation

Config H legacy DateTime+ignoreTZ with isoNoZ input stores correctly in BRT. No fake Z appended because `useLegacy=true` bypasses the `getCalendarFieldValue()` path that adds `[Z]`. Key Bug #5 comparison with Config D which does add fake Z.

## Next Action

No further action — closed PASS.
