# TC-1-D-BRT — Summary

**Spec**: [tc-1-D-BRT.md](../test-cases/tc-1-D-BRT.md)
**Current status**: FAIL — last run 2026-04-03 (BRT, Firefox)
**Bug surface**: Bug #5 — fake Z in GetFieldValue causes -3h drift per round-trip in BRT

## Run History

| Run | Date        | TZ  | Outcome | File                                 |
| --- | ----------- | --- | ------- | ------------------------------------ |
| 1   | ~2026-03-27 | BRT | FAIL-2  | [run-1](../runs/tc-1-D-BRT-run-1.md) |
| 2   | 2026-04-03  | BRT | FAIL    | [run-2](../runs/tc-1-D-BRT-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): FAIL. Cross-browser verification in progress.

## Next Action

Bug #5 confirmed across all three timezones. No additional re-runs needed for this specific scenario. Fix planning tracked in analysis.md.
