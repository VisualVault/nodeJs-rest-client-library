# TC-3-E-BRT-BRT — Summary

**Spec**: [tc-3-E-BRT-BRT.md](../test-cases/tc-3-E-BRT-BRT.md)
**Current status**: PASS — last run 2026-04-02 (BRT)
**Bug surface**: none — value survives same-TZ reload intact

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-02 | BRT | PASS    | [run-1](../runs/tc-3-E-BRT-BRT-run-1.md) |

## Current Interpretation

Config E legacy date-only (`enableTime=false`, `ignoreTimezone=false`, `useLegacy=true`) survives same-TZ save/reload in BRT. The stored value `"2026-03-15"` (date-only string, typed input) is unchanged after reload. GFV returns raw value unchanged. Consistent with Config A (non-legacy equivalent) — legacy flag does not alter date-only reload behavior.

## Next Action

Run 3-E-BRT-IST (cross-TZ) to verify legacy date-only strings survive cross-TZ reload.
