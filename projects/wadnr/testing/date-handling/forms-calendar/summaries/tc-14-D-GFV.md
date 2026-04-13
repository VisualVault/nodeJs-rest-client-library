# TC-14-D-GFV — Summary

**Spec**: [tc-14-D-GFV.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-D-GFV.md)
**Current status**: FAIL-3 — last run 2026-04-13 (BRT)
**Bug surface**: FORM-BUG-5 (fake Z in GetFieldValue)

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-13 | BRT | FAIL-3  | [run-1](../runs/tc-14-D-GFV-run-1.md) |

## Current Interpretation

Same FORM-BUG-5 as 14-D-SFV — GFV read path applies the same fake Z transformation. Raw value unchanged from SFV set.

## Next Action

Run Phase C after mask addition.
