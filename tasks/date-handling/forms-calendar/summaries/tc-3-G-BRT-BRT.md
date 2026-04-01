# TC-3-G-BRT-BRT — Summary

**Spec**: [tc-3-G-BRT-BRT.md](../test-cases/tc-3-G-BRT-BRT.md)
**Current status**: PASS — last run 2026-04-01 (BRT)
**Bug surface**: none — value survives same-TZ reload intact

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-01 | BRT | PASS    | [run-1](../runs/tc-3-G-BRT-BRT-run-1.md) |

## Current Interpretation

Config G legacy DateTime (`enableTime=true, ignoreTimezone=false, useLegacy=true`) survives same-TZ save/reload in BRT without any shift. The stored value `"2026-03-15T00:00:00"` (typed input, local midnight, no Z suffix) is unchanged after reload through `initCalendarValueV1` → `parseDateString()`. GFV returns raw value unchanged (legacy path). Consistent with Config C (non-legacy equivalent) same-TZ behavior.

## Next Action

Run 3-G-BRT-IST (cross-TZ) to test whether Bug #1 causes shift when loading a BRT-saved Config G record in IST.
