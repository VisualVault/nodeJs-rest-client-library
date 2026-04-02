# TC-3-F-BRT-BRT — Summary

**Spec**: [tc-3-F-BRT-BRT.md](../test-cases/tc-3-F-BRT-BRT.md)
**Current status**: PASS — last run 2026-04-02 (BRT)
**Bug surface**: none — ignoreTZ inert for date-only; value survives same-TZ reload intact

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-02 | BRT | PASS    | [run-1](../runs/tc-3-F-BRT-BRT-run-1.md) |

## Current Interpretation

Config F legacy date-only + ignoreTZ (`enableTime=false`, `ignoreTimezone=true`, `useLegacy=true`) survives same-TZ save/reload in BRT. The stored value `"2026-03-15"` is unchanged after reload. `ignoreTimezone=true` is inert for date-only fields — Config F behaves identically to Config E. GFV returns raw value unchanged.

## Next Action

Run 3-F-BRT-IST (cross-TZ) to verify ignoreTZ remains inert for date-only in cross-TZ reload.
