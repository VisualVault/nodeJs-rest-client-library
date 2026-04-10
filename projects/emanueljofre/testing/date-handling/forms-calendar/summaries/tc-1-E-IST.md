# TC-1-E-IST — Summary

**Spec**: [tc-1-E-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-1-E-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Legacy format + IST midnight UTC crossover — stored UTC datetime has previous-day date portion

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-1-E-IST-run-1.md) |
| 2   | 2026-04-09 | IST | FAIL    | [run-2](../runs/tc-1-E-IST-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

IST legacy popup behavior documented for Config E. Expected to generalize to Configs F, G, H in IST (pending). Run tc-1-F-IST.md, tc-1-G-IST.md, tc-1-H-IST.md to confirm the pattern.
