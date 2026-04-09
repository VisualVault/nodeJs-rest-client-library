# TC-11-G-save-BRT-load-IST — Summary

**Spec**: [tc-11-G-save-BRT-load-IST.md](../test-cases/tc-11-G-save-BRT-load-IST.md)
**Current status**: PASS — last run 2026-04-09 (IST, Playwright CLI)
**Bug surface**: none — legacy DateTime GFV returns raw

## Run History

| Run | Date       | TZ  | Outcome | File                                                |
| --- | ---------- | --- | ------- | --------------------------------------------------- |
| 1   | 2026-04-09 | IST | PASS    | [run-1](../runs/tc-11-G-save-BRT-load-IST-run-1.md) |

## Current Interpretation

Passes consistently — Config G (legacy DateTime, ignoreTimezone=false) raw value preserved across BRT→IST. `useLegacy=true` short-circuits GFV before checking `ignoreTimezone`, so G behaves identically to H. Completes the legacy DateTime pair for BRT→IST cross-TZ load.

## Next Action

No further action — closed PASS.
