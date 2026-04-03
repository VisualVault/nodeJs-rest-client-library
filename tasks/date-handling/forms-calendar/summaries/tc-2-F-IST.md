# TC-2-F-IST — Summary

**Spec**: [tc-2-F-IST.md](../test-cases/tc-2-F-IST.md)
**Current status**: FAIL — last run 2026-04-03 (IST, Firefox)
**Bug surface**: Bug #7 (date-only -1 day in UTC+), Bug #2 (legacy popup vs typed format inconsistency)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-2-F-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-2-F-IST-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): FAIL. Cross-browser verification in progress.

## Next Action

Run 2-E-IST to confirm Config E typed IST produces the same result. Then proceed to 2-G-IST / 2-H-IST (legacy DateTime typed in IST).
