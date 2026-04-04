# TC-9-D-IST-8 — Summary

**Spec**: [tc-9-D-IST-8.md](../test-cases/tc-9-D-IST-8.md)
**Current status**: FAIL — last run 2026-04-03 (IST, Chromium)
**Bug surface**: Bug #5 — fake Z on GFV causes +5:30h/trip drift, +44h after 8 trips

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-03 | IST | FAIL    | [run-1](../runs/tc-9-D-IST-8-run-1.md) |

## Current Interpretation

8 trips at IST (+5:30) accumulate +44h of forward drift, pushing Mar 15 00:00 to Mar 16 20:00. Nearly 2 full days gained. Confirms the IST drift rate and validates the linear drift model at higher trip counts.

## Next Action

No further action.
