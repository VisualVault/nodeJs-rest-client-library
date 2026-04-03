# TC-7-D-isoZ-IST — Summary

**Spec**: [tc-7-D-isoZ-IST.md](../test-cases/tc-7-D-isoZ-IST.md)
**Current status**: FAIL — last run 2026-04-03 (IST, Firefox)
**Bug surface**: ISO+Z input shifted by TZ offset on Config D — related to Bug #5 fake Z / getSaveValue local extraction

## Run History

| Run | Date       | TZ  | Outcome | File                                      |
| --- | ---------- | --- | ------- | ----------------------------------------- |
| 1   | 2026-04-01 | IST | FAIL    | [run-1](../runs/tc-7-D-isoZ-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-7-D-isoZ-IST-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): FAIL. Cross-browser verification in progress.

## Next Action

No further ISO+Z input testing needed for Config D. The behavior is deterministic: shift = TZ offset. Document in developer guidance as a known unsafe input format.
