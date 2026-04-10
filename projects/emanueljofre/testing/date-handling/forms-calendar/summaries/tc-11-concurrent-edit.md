# TC-11-concurrent-edit — Summary

**Spec**: [tc-11-concurrent-edit.md](tasks/date-handling/forms-calendar/test-cases/tc-11-concurrent-edit.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: Bug #5 — compound drift across two users in different timezones

## Run History

| Run | Date       | TZ      | Outcome | File                                            |
| --- | ---------- | ------- | ------- | ----------------------------------------------- |
| 1   | 2026-04-08 | BRT+IST | FAIL    | [run-1](../runs/tc-11-concurrent-edit-run-1.md) |
| 2   | 2026-04-09 | BRT     | FAIL    | [run-2](../runs/tc-11-concurrent-edit-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Re-run after FORM-BUG-5 fix deployed. Both concurrent-edit variants (BRT→IST and IST→BRT) should show 0 drift.
