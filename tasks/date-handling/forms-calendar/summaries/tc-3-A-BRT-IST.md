# TC-3-A-BRT-IST — Summary

**Spec**: [tc-3-A-BRT-IST.md](../test-cases/tc-3-A-BRT-IST.md)
**Current status**: PASS — last run 2026-04-03 (IST, Firefox)
**Bug surface**: Bug #7 predicted but NOT triggered — date-only string survives cross-TZ reload

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-01 | IST | PASS    | [run-1](../runs/tc-3-A-BRT-IST-run-1.md) |
| 2   | 2026-04-01 | IST | PASS    | [run-2](../runs/tc-3-A-BRT-IST-run-2.md) |
| 3   | 2026-04-03 | IST | PASS    | [run-3](../runs/tc-3-A-BRT-IST-run-3.md) |

## Current Interpretation

Run 3 (2026-04-03, Firefox): PASS. Cross-browser verification in progress.

## Next Action

No further action — closed PASS. Run 3-B-BRT-IST to confirm the corrected prediction holds for Config B (date-only + ignoreTZ).
