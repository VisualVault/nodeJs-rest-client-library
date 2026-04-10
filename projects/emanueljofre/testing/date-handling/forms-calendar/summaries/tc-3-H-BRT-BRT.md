# TC-3-H-BRT-BRT — Summary

**Spec**: [tc-3-H-BRT-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-3-H-BRT-BRT.md)
**Current status**: PASS — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: none — useLegacy=true bypasses Bug #5; value survives same-TZ reload intact

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-02 | BRT | PASS    | [run-1](../runs/tc-3-H-BRT-BRT-run-1.md) |
| 2   | 2026-04-03 | BRT | PASS    | [run-2](../runs/tc-3-H-BRT-BRT-run-2.md) |
| 3   | 2026-04-09 | BRT | PASS    | [run-3](../runs/tc-3-H-BRT-BRT-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): PASS. Cross-browser verification in progress.

## Next Action

Run 3-H-BRT-IST (cross-TZ) to test if legacy DateTime + ignoreTZ survives cross-TZ reload.
