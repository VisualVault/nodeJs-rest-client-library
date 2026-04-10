# TC-5-D-BRT — Summary

**Spec**: [tc-5-D-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-5-D-BRT.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: Bug #5 — fake Z on preset DateTime field at form load (-3h shift in BRT)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | FAIL-3  | [run-1](../runs/tc-5-D-BRT-run-1.md) |
| 2   | 2026-04-09 | BRT | FAIL    | [run-2](../runs/tc-5-D-BRT-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Test 5-D-UTC0 to confirm that Bug #5 is harmless at UTC+0 (fake Z coincidentally correct when local = UTC).
