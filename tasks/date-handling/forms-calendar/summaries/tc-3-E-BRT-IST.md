# TC-3-E-BRT-IST — Summary

**Spec**: [tc-3-E-BRT-IST.md](../test-cases/tc-3-E-BRT-IST.md)
**Current status**: PASS — last run 2026-04-02 (IST)
**Bug surface**: none — date-only string survives cross-TZ reload intact

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-02 | IST | PASS    | [run-1](../runs/tc-3-E-BRT-IST-run-1.md) |

## Current Interpretation

Config E legacy date-only (`enableTime=false`, `ignoreTimezone=false`, `useLegacy=true`) survives cross-TZ reload (BRT→IST). The stored value `"2026-03-15"` is unchanged when loaded in IST (UTC+5:30). Bug #7 does not fire on the form load path for date-only fields. Consistent with non-legacy equivalents (3-A-BRT-IST, 3-B-BRT-IST both PASS).

## Next Action

No further action — cross-TZ behavior validated. Config E is fully characterized for both same-TZ (BRT→BRT, PASS) and cross-TZ (BRT→IST, PASS).
