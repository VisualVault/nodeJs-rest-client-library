# TC-WS-10A-H-BRT — Summary

**Spec**: [tc-ws-10a-H-BRT.md](tasks/date-handling/web-services/test-cases/tc-ws-10a-H-BRT.md)
**Current status**: FAIL — last run 2026-04-06 (BRT)
**Bug surface**: CB-8 + CB-11 — like Config D minus Bug #5 fake Z

## Run History

| Run | Date       | TZ  | Outcome | File                                              |
| --- | ---------- | --- | ------- | ------------------------------------------------- |
| 1   | 2026-04-06 | BRT | FAIL    | [ws-10-batch-run-1](../runs/ws-10-batch-run-1.md) |

## Current Interpretation

Config H (legacy DateTime + ignoreTZ) shows same CB-8 shift as Config D. Legacy code path does not add Bug #5 fake Z to GFV. Display preserved by ignoreTZ.

## Next Action

No further action — legacy variant documented.
