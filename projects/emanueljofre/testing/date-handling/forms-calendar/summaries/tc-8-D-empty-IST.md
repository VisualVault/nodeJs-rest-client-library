# TC-8-D-empty-IST — Summary

**Spec**: [tc-8-D-empty-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-8-D-empty-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Bug #6 — GetFieldValue returns "Invalid Date" for empty Config D field

## Run History

| Run | Date       | TZ  | Outcome | File                                       |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| 1   | 2026-04-01 | IST | FAIL    | [run-1](../runs/tc-8-D-empty-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-8-D-empty-IST-run-2.md) |
| 3   | 2026-04-09 | IST | FAIL    | [run-3](../runs/tc-8-D-empty-IST-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No further TZ runs needed for Bug #6 scope — it is universally confirmed. Focus on characterizing the fix (guard clause in `getCalendarFieldValue()`).
