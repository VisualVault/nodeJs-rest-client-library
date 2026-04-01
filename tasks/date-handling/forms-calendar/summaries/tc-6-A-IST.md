# TC-6-A-IST — Summary

**Spec**: [tc-6-A-IST.md](../test-cases/tc-6-A-IST.md)
**Current status**: PASS — last run 2026-04-01 (IST)
**Bug surface**: none — Current Date is the only fully correct initialization path

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-01 | IST | PASS    | [run-1](../runs/tc-6-A-IST-run-1.md) |

## Current Interpretation

Current Date auto-population works correctly in IST. Uses `new Date()` → UTC timestamp, avoiding the `moment(e).toDate()` parsing that causes Bug #7 on the Preset Date path. Stored value is a Date object with the exact UTC moment of form load. Display shows correct IST date. Cross-midnight edge case (00:00–05:30 IST where UTC is previous day) not triggered in this run.

## Next Action

Re-run during IST midnight window (00:00–05:30 IST) to verify cross-midnight edge case. Otherwise closed PASS.
