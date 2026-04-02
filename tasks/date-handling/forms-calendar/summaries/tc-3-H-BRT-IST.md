# TC-3-H-BRT-IST — Summary

**Spec**: [tc-3-H-BRT-IST.md](../test-cases/tc-3-H-BRT-IST.md)
**Current status**: PASS — last run 2026-04-02 (IST)
**Bug surface**: none — useLegacy=true bypasses Bug #5 in cross-TZ context

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-02 | IST | PASS    | [run-1](../runs/tc-3-H-BRT-IST-run-1.md) |

## Current Interpretation

Config H legacy DateTime + ignoreTZ (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`) survives cross-TZ reload (BRT→IST). The stored value `"2026-03-15T00:00:00"` is unchanged and GFV returns it without fake Z — confirming `useLegacy=true` as a reliable Bug #5 mitigation even in cross-TZ IST context. Key contrast: Config D (non-legacy, 3-D-BRT-IST) has identical raw value survival but GFV appends fake Z (Bug #5).

## Next Action

No further action — cross-TZ behavior validated. Config H is fully characterized for both same-TZ (BRT→BRT, PASS) and cross-TZ (BRT→IST, PASS).
