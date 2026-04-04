# TC-7-G-isoNoZ-BRT — Summary

**Spec**: [tc-7-G-isoNoZ-BRT.md](../test-cases/tc-7-G-isoNoZ-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — legacy DateTime GFV returns raw, no UTC conversion

## Run History

| Run | Date       | TZ  | Outcome | File                                        |
| --- | ---------- | --- | ------- | ------------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-7-G-isoNoZ-BRT-run-1.md) |

## Current Interpretation

Config G legacy DateTime with isoNoZ input stores correctly in BRT. GFV returns raw value directly without UTC conversion (unlike Config C). Same underlying store as C-isoNoZ but different GFV output path due to `useLegacy=true`.

## Next Action

No further action — closed PASS.
