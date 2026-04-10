# TC-2-E-IST — Summary

**Spec**: [tc-2-E-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-2-E-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Bug #7 (date-only -1 day shift in UTC+), Bug #2 (popup vs typed format inconsistency)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-2-E-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-2-E-IST-run-2.md) |
| 3   | 2026-04-09 | IST | FAIL    | [run-3](../runs/tc-2-E-IST-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Run 2-F-IST (sibling — same as E but with ignoreTZ=true) to confirm ignoreTZ has no effect on legacy date-only typed input in IST.
