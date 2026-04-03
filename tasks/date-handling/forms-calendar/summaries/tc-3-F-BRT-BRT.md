# TC-3-F-BRT-BRT — Summary

**Spec**: [tc-3-F-BRT-BRT.md](../test-cases/tc-3-F-BRT-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Firefox)
**Bug surface**: none — ignoreTZ inert for date-only; value survives same-TZ reload intact

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-02 | BRT | PASS    | [run-1](../runs/tc-3-F-BRT-BRT-run-1.md) |
| 2   | 2026-04-03 | BRT | PASS    | [run-2](../runs/tc-3-F-BRT-BRT-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): PASS. Cross-browser verification in progress.

## Next Action

Run 3-F-BRT-IST (cross-TZ) to verify ignoreTZ remains inert for date-only in cross-TZ reload.
