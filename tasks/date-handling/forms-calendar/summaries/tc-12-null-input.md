# TC-12-null-input — Summary

**Spec**: [tc-12-null-input.md](../test-cases/tc-12-null-input.md)
**Current status**: FAIL — last run 2026-04-08 (BRT)
**Bug surface**: FORM-BUG-6 (Invalid Date from null input)

## Run History

| Run | Date       | TZ  | Outcome | File                                       |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| 1   | 2026-04-08 | BRT | FAIL    | [run-1](../runs/tc-12-null-input-run-1.md) |

## Current Interpretation

Bug #6 confirmed for `null` input — identical behavior to `""`. `SetFieldValue(field, null)` normalizes to empty internally, then `getCalendarFieldValue()` produces `"Invalid Date"` via `moment("").format()`. No distinction between `null` and `""` for FORM-BUG-6 purposes.

## Next Action

No further action — confirmed as same mechanism as tc-12-empty-value. Fix for FORM-BUG-6 (empty guard in `getCalendarFieldValue()`) will cover both `null` and `""`.
