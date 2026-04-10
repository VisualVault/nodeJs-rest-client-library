# TC-1-A-IST — Summary

**Spec**: [tc-1-A-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-1-A-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Bug #7 — date-only popup stores -1 day for UTC+ timezones

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-30 | IST | FAIL-1  | [run-1](../runs/tc-1-A-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-1-A-IST-run-2.md) |
| 3   | 2026-04-09 | IST | FAIL    | [run-3](../runs/tc-1-A-IST-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Bug #7 confirmed. Run tc-2-A-IST.md (typed input IST) to test if Bug #7 produces the same -1 day shift via typed input vs popup (testing Bug #2 hypothesis — popup creates Date object, typed creates string, potentially different shift amounts).
