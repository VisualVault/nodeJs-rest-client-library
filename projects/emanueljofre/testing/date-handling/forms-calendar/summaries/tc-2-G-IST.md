# TC-2-G-IST — Summary

**Spec**: [tc-2-G-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-2-G-IST.md)
**Current status**: PASS — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Bug #2 (inconsistent popup vs typed handlers) — typed input stores correctly; popup does not

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | PASS    | [run-1](../runs/tc-2-G-IST-run-1.md) |
| 2   | 2026-04-03 | IST | PASS    | [run-2](../runs/tc-2-G-IST-run-2.md) |
| 3   | 2026-04-09 | IST | PASS    | [run-3](../runs/tc-2-G-IST-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): PASS. Cross-browser verification in progress.

## Next Action

Run 2-H-IST to confirm `ignoreTimezone` is a no-op for legacy typed DateTime (expected same result). Then run 2-C-IST and 2-D-IST to confirm non-legacy typed DateTime also stores local midnight in IST.
