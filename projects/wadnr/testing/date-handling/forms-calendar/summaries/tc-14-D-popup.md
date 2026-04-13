# TC-14-D-popup — Summary

**Spec**: [tc-14-D-popup.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-D-popup.md)
**Current status**: FAIL-3 — last run 2026-04-13 (BRT)
**Bug surface**: FORM-BUG-5 (fake Z in GetFieldValue)

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-13 | BRT | FAIL-3  | [run-1](../runs/tc-14-D-popup-run-1.md) |

## Current Interpretation

Config D popup stores local midnight correctly (`T00:00:00`), but GetFieldValue appends fake Z → `T00:00:00.000Z` (FORM-BUG-5). For midnight, the fake Z has no practical date impact, but it confirms the API contract violation is consistent across all input methods.

## Next Action

Run Phase C after mask addition. Triple compound: mask + popup + Bug #5.
