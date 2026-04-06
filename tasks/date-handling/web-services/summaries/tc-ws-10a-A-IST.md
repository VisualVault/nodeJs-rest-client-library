# TC-WS-10A-A-IST — Summary

**Spec**: [tc-ws-10a-A-IST.md](../test-cases/tc-ws-10a-A-IST.md)
**Current status**: PASS — last run 2026-04-06 (IST)
**Bug surface**: none — date-only immune to CB-8 time shift

## Run History

| Run | Date       | TZ  | Outcome | File                                              |
| --- | ---------- | --- | ------- | ------------------------------------------------- |
| 1   | 2026-04-06 | IST | PASS    | [ws-10-batch-run-1](../runs/ws-10-batch-run-1.md) |

## Current Interpretation

Date-only Config A displays correctly in IST. API stores `T00:00:00Z` — resolves to March 15 5:30 AM IST, same calendar date. Consistent with WS-4-A-IST and WS-10A-A-BRT.

## Next Action

No further action — confirmed.
