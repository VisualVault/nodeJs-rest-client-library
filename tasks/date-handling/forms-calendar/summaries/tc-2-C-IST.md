# TC-2-C-IST — Summary

**Spec**: [tc-2-C-IST.md](../test-cases/tc-2-C-IST.md)
**Current status**: PASS — last run 2026-03-31 (IST)
**Bug surface**: none — Config C DateTime with ignoreTimezone=false is outside Bug #5/#6/#7 surface

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | PASS    | [run-1](../runs/tc-2-C-IST-run-1.md) |

## Current Interpretation

Config C typed input in IST stores local midnight `"2026-03-15T00:00:00"` — identical to popup (1-C-IST) and BRT (2-C-BRT). No timezone shift in storage, correct UTC in GetFieldValue. Matrix prediction was wrong (predicted UTC offset stored); corrected to match confirmed `getSaveValue()` local-time behavior.

## Next Action

No further action — closed PASS. Run 2-D-IST next to verify Config D typed input in IST (Bug #5 surface).
