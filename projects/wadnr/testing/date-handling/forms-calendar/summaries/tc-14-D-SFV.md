# TC-14-D-SFV — Summary

**Spec**: [tc-14-D-SFV.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-D-SFV.md)
**Current status**: FAIL-3 — last run 2026-04-13 (BRT)
**Bug surface**: FORM-BUG-5 (fake Z in GetFieldValue)

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-13 | BRT | FAIL-3  | [run-1](../runs/tc-14-D-SFV-run-1.md) |

## Current Interpretation

FORM-BUG-5 confirmed: GetFieldValue returns `"2026-03-15T14:30:00.000Z"` (fake Z on local time). Raw storage is correct. This is the expected baseline behavior for Config D. Phase C will reveal whether mask + Bug #5 produce a compound effect.

## Next Action

Run Phase C after mask addition. Compound risk: mask may truncate time, then Bug #5 adds Z to the truncated value.
