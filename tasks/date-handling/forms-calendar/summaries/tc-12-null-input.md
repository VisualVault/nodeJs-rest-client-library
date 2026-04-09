# TC-12-null-input — Summary

**Spec**: [tc-12-null-input.md](../test-cases/tc-12-null-input.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: FORM-BUG-6 (Invalid Date from null input)

## Run History

| Run | Date       | TZ  | Outcome | File                                       |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| 1   | 2026-04-08 | BRT | FAIL    | [run-1](../runs/tc-12-null-input-run-1.md) |
| 2   | 2026-04-09 | BRT | FAIL    | [run-2](../runs/tc-12-null-input-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No further action — confirmed as same mechanism as tc-12-empty-value. Fix for FORM-BUG-6 (empty guard in `getCalendarFieldValue()`) will cover both `null` and `""`.
