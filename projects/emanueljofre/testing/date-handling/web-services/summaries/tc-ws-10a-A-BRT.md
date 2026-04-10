# TC-WS-10A-A-BRT — Summary

**Spec**: [tc-ws-10a-A-BRT.md](tasks/date-handling/web-services/test-cases/tc-ws-10a-A-BRT.md)
**Current status**: PASS — last run 2026-04-06 (BRT)
**Bug surface**: none — date-only immune to CB-8 time shift

## Run History

| Run | Date       | TZ  | Outcome | File                                              |
| --- | ---------- | --- | ------- | ------------------------------------------------- |
| 1   | 2026-04-06 | BRT | PASS    | [ws-10-batch-run-1](../runs/ws-10-batch-run-1.md) |

## Current Interpretation

Date-only Config A displays correctly in BRT. API stores `T00:00:00Z` — resolves to same calendar date in BRT (UTC-3). Consistent with WS-4-A-BRT.

## Next Action

No further action — confirmed.
