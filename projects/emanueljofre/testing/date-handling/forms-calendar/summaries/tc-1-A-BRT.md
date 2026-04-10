# TC-1-A-BRT — Summary

**Spec**: [tc-1-A-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-1-A-BRT.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: none — BRT is UTC-3, no shift on date-only fields

## Run History

| Run | Date        | TZ  | Outcome | File                                 |
| --- | ----------- | --- | ------- | ------------------------------------ |
| 1   | ~2026-03-27 | BRT | PASS    | [run-1](../runs/tc-1-A-BRT-run-1.md) |
| 2   | 2026-03-31  | BRT | PASS    | [run-2](../runs/tc-1-A-BRT-run-2.md) |
| 3   | 2026-04-01  | BRT | PASS    | [run-3](../runs/tc-1-A-BRT-run-3.md) |
| 4   | 2026-04-01  | BRT | PASS    | [run-4](../runs/tc-1-A-BRT-run-4.md) |
| 5   | 2026-04-03  | BRT | PASS    | [run-5](../runs/tc-1-A-BRT-run-5.md) |
| 6   | 2026-04-03  | BRT | PASS    | [run-6](../runs/tc-1-A-BRT-run-6.md) |
| 7   | 2026-04-09  | BRT | FAIL    | [run-7](../runs/tc-1-A-BRT-run-7.md) |

## Current Interpretation

Run 7 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

All major browser engines verified. No further cross-browser runs needed. Monitor if VV platform build changes. Sibling IST test (tc-1-A-IST.md) is the active Bug #7 evidence.
