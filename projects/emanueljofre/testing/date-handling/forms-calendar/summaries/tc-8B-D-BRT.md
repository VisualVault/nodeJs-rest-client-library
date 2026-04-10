# TC-8B-D-BRT — Summary

**Spec**: [tc-8B-D-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-8B-D-BRT.md)
**Current status**: PASS — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: Bug #5 re-confirmed via GFV comparison; GDOC itself is correct

## Run History

| Run | Date       | TZ  | Outcome       | File                                  |
| --- | ---------- | --- | ------------- | ------------------------------------- |
| 1   | 2026-04-01 | BRT | PASS + FAIL-1 | [run-1](../runs/tc-8B-D-BRT-run-1.md) |
| 2   | 2026-04-03 | BRT | PASS          | [run-2](../runs/tc-8B-D-BRT-run-2.md) |
| 3   | 2026-04-09 | BRT | PASS          | [run-3](../runs/tc-8B-D-BRT-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): PASS. Cross-browser verification in progress.

## Next Action

Run 8B-D-IST next to verify GDOC in UTC+ timezone — should show IST midnight as previous UTC day in toISOString().
