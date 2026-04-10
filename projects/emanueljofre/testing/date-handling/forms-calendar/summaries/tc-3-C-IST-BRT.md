# TC-3-C-IST-BRT — Summary

**Spec**: [tc-3-C-IST-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-3-C-IST-BRT.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: Bug #1 (timezone marker stripping) + Bug #4 (legacy save format)

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-01 | BRT | FAIL    | [run-1](../runs/tc-3-C-IST-BRT-run-1.md) |
| 2   | 2026-04-03 | BRT | FAIL    | [run-2](../runs/tc-3-C-IST-BRT-run-2.md) |
| 3   | 2026-04-09 | BRT | FAIL    | [run-3](../runs/tc-3-C-IST-BRT-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Re-run after Bug #1+#4 fix deployed. Compare with Config D cross-TZ reload (3-D-IST-BRT already PASS — Config D raw is TZ-invariant by design).
