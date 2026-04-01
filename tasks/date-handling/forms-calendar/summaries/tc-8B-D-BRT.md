# TC-8B-D-BRT — Summary

**Spec**: [tc-8B-D-BRT.md](../test-cases/tc-8B-D-BRT.md)
**Current status**: PASS + FAIL-1 — last run 2026-04-01 (BRT)
**Bug surface**: Bug #5 re-confirmed via GFV comparison; GDOC itself is correct

## Run History

| Run | Date       | TZ  | Outcome       | File                                  |
| --- | ---------- | --- | ------------- | ------------------------------------- |
| 1   | 2026-04-01 | BRT | PASS + FAIL-1 | [run-1](../runs/tc-8B-D-BRT-run-1.md) |

## Current Interpretation

GetDateObjectFromCalendar returns a correct Date object for Config D in BRT — toString() shows local midnight, toISOString() produces genuine UTC (BRT midnight + 3h). This confirms GDOC avoids Bug #5. The GFV comparison step (FAIL-1) re-confirms Bug #5: GFV returns `"2026-03-15T00:00:00.000Z"` (fake Z, local time mislabeled as UTC) while GDOC.toISOString() returns the correct `"2026-03-15T03:00:00.000Z"`. The 3h discrepancy is exactly the BRT offset, proving the fake Z.

## Next Action

Run 8B-D-IST next to verify GDOC in UTC+ timezone — should show IST midnight as previous UTC day in toISOString().
