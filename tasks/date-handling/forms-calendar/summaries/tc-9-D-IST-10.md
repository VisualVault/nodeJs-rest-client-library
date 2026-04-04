# TC-9-D-IST-10 — Summary

**Spec**: [tc-9-D-IST-10.md](../test-cases/tc-9-D-IST-10.md)
**Current status**: FAIL — last run 2026-04-03 (IST, Chromium)
**Bug surface**: Bug #5 — fake Z on GFV causes +5:30h/trip drift, +55h after 10 trips

## Run History

| Run | Date       | TZ  | Outcome | File                                    |
| --- | ---------- | --- | ------- | --------------------------------------- |
| 1   | 2026-04-03 | IST | FAIL    | [run-1](../runs/tc-9-D-IST-10-run-1.md) |

## Current Interpretation

10 trips at IST (+5:30) accumulate +55h, pushing Mar 15 to Mar 17 07:00 — more than 2 full days forward. Mirrors BRT-10 (which drifts -30h in the opposite direction). Confirms the drift model scales linearly regardless of trip count.

## Next Action

No further action.
