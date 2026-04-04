# TC-8-G-BRT — Summary

**Spec**: [tc-8-G-BRT.md](../test-cases/tc-8-G-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Chromium)
**Bug surface**: none — legacy DateTime returns raw (no UTC conversion)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-8-G-BRT-run-1.md) |

## Current Interpretation

Legacy DateTime Config G GFV returns raw value unchanged. **Matrix prediction corrected**: expected real UTC (`"2026-03-15T03:00:00.000Z"`), actual is raw (`"2026-03-15T00:00:00"`). `useLegacy=true` skips the non-legacy branch before the `ignoreTimezone` check, so `ignoreTimezone=false` never triggers UTC conversion. Config G behaves identically to Config H for GFV.

## Next Action

No further action — behavior characterized.
