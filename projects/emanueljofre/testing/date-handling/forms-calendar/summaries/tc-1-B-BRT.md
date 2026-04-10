# TC-1-B-BRT — Summary

**Spec**: [tc-1-B-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-1-B-BRT.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: none — ignoreTZ=true has no effect on date-only storage in BRT

## Run History

| Run | Date        | TZ  | Outcome | File                                 |
| --- | ----------- | --- | ------- | ------------------------------------ |
| 1   | ~2026-03-27 | BRT | PASS    | [run-1](../runs/tc-1-B-BRT-run-1.md) |
| 2   | 2026-04-01  | BRT | PASS    | [run-2](../runs/tc-1-B-BRT-run-2.md) |
| 3   | 2026-04-03  | BRT | PASS    | [run-3](../runs/tc-1-B-BRT-run-3.md) |
| 4   | 2026-04-09  | BRT | FAIL    | [run-4](../runs/tc-1-B-BRT-run-4.md) |

## Current Interpretation

Run 4 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No re-run needed for BRT. Sibling IST test (tc-1-B-IST.md) confirms ignoreTZ has no protective effect against Bug #7 in UTC+ timezones.
