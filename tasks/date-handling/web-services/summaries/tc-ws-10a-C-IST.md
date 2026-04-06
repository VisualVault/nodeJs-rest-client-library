# TC-WS-10A-C-IST — Summary

**Spec**: [tc-ws-10a-C-IST.md](../test-cases/tc-ws-10a-C-IST.md)
**Current status**: FAIL — last run 2026-04-06 (IST)
**Bug surface**: CB-8 — UTC→IST shift (+5:30h)

## Run History

| Run | Date       | TZ  | Outcome | File                                              |
| --- | ---------- | --- | ------- | ------------------------------------------------- |
| 1   | 2026-04-06 | IST | FAIL    | [ws-10-batch-run-1](../runs/ws-10-batch-run-1.md) |

## Current Interpretation

Config C in IST — same CB-8 behavior as BRT but opposite direction. 14:30 UTC → 8:00 PM IST (+5:30h shift). Confirms shift magnitude equals TZ offset.

## Next Action

Document as cross-layer design issue.
