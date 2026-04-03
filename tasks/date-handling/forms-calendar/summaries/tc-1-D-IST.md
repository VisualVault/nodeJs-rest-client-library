# TC-1-D-IST — Summary

**Spec**: [tc-1-D-IST.md](../test-cases/tc-1-D-IST.md)
**Current status**: FAIL — last run 2026-04-03 (IST, Firefox)
**Bug surface**: Bug #5 — fake Z in GetFieldValue causes +5:30h drift per round-trip in IST

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-30 | IST | FAIL-2  | [run-1](../runs/tc-1-D-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-1-D-IST-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): FAIL. Cross-browser verification in progress.

## Next Action

Bug #5 confirmed for IST. Drift direction (forward) documented. Fix planning in analysis.md. No additional runs needed for this scenario.
