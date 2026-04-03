# TC-8B-D-BRT — Summary

**Spec**: [tc-8B-D-BRT.md](../test-cases/tc-8B-D-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Firefox)
**Bug surface**: Bug #5 re-confirmed via GFV comparison; GDOC itself is correct

## Run History

| Run | Date       | TZ  | Outcome       | File                                  |
| --- | ---------- | --- | ------------- | ------------------------------------- |
| 1   | 2026-04-01 | BRT | PASS + FAIL-1 | [run-1](../runs/tc-8B-D-BRT-run-1.md) |
| 2   | 2026-04-03 | BRT | PASS          | [run-2](../runs/tc-8B-D-BRT-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): PASS. Cross-browser verification in progress.

## Next Action

Run 8B-D-IST next to verify GDOC in UTC+ timezone — should show IST midnight as previous UTC day in toISOString().
