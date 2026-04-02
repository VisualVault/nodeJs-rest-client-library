# TC-3-H-BRT-BRT — Summary

**Spec**: [tc-3-H-BRT-BRT.md](../test-cases/tc-3-H-BRT-BRT.md)
**Current status**: PASS — last run 2026-04-02 (BRT)
**Bug surface**: none — useLegacy=true bypasses Bug #5; value survives same-TZ reload intact

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-02 | BRT | PASS    | [run-1](../runs/tc-3-H-BRT-BRT-run-1.md) |

## Current Interpretation

Config H legacy DateTime + ignoreTZ (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`) survives same-TZ save/reload in BRT. The stored value `"2026-03-15T00:00:00"` is unchanged after reload. GFV returns raw value without transformation — `useLegacy=true` bypasses Bug #5 fake Z (consistent with TC-8-H-BRT and TC-3-G-BRT-BRT). Both legacy DateTime configs (G and H) behave identically on same-TZ reload regardless of ignoreTimezone.

## Next Action

Run 3-H-BRT-IST (cross-TZ) to test if legacy DateTime + ignoreTZ survives cross-TZ reload.
