# TC-14-D-save — Summary

**Spec**: [tc-14-D-save.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-D-save.md)
**Current status**: FAIL-3 — last run 2026-04-13 (BRT)
**Bug surface**: FORM-BUG-5 — persists after save/reload

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-13 | BRT | FAIL-3  | [run-1](../runs/tc-14-D-save-run-1.md) |

## Current Interpretation

FORM-BUG-5 persists after reload. Raw value is preserved correctly through save pipeline, but API read-back (GetFieldValue) still appends fake Z due to ignoreTimezone flag.

## Next Action

Run Phase C after mask addition.
