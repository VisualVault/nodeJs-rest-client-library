# TC-1-H-IST — Summary

**Spec**: [tc-1-H-IST.md](../test-cases/tc-1-H-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Legacy format + IST midnight UTC crossover + ignoreTZ confirmed no-op

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-1-H-IST-run-1.md) |
| 2   | 2026-04-09 | IST | FAIL    | [run-2](../runs/tc-1-H-IST-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

All legacy IST popup tests complete. No further action for Category 1 legacy IST. Next priority: legacy typed input in IST (Category 2, E–H IST) or legacy UTC+0 controls (1-E-UTC0, 1-F-UTC0).
