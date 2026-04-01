# TC-3-B-BRT-BRT — Summary

**Spec**: [tc-3-B-BRT-BRT.md](../test-cases/tc-3-B-BRT-BRT.md)
**Current status**: PASS — last run 2026-04-01 (BRT)
**Bug surface**: none — control/passing scenario

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-01 | BRT | PASS    | [run-1](../runs/tc-3-B-BRT-BRT-run-1.md) |

## Current Interpretation

Config B (`enableTime=false, ignoreTimezone=true`) behaves identically to Config A (`enableTime=false, ignoreTimezone=false`) for save/reload in BRT. The `ignoreTimezone` flag is inert for date-only fields — it only triggers Bug #5 when `enableTime=true`. Date-only string `"2026-03-15"` survives the server round-trip without shift or format change. No bugs apply in BRT (UTC-3).

## Next Action

Run 3-B-BRT-IST next — cross-TZ reload to verify Config B date-only behavior matches 3-A-BRT-IST (expected PASS, no shift). DataID `c63dea33-867e-49e2-b929-fb226b6d3933` (DateTest-000107) is available as a saved record.
