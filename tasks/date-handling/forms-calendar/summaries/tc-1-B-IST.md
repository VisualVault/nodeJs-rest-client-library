# TC-1-B-IST — Summary

**Spec**: [tc-1-B-IST.md](../test-cases/tc-1-B-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Bug #7 — date-only popup stores -1 day in IST; ignoreTZ=true has no protective effect

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-30 | IST | FAIL-1  | [run-1](../runs/tc-1-B-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-1-B-IST-run-2.md) |
| 3   | 2026-04-09 | IST | FAIL    | [run-3](../runs/tc-1-B-IST-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Bug #7 confirmed for both Config A and B in IST. No further runs of this TC needed unless platform build changes. Track alongside tc-1-A-IST.md for Bug #7 fix coverage.
