# TC-WS-10A-C-BRT — Summary

**Spec**: [tc-ws-10a-C-BRT.md](tasks/date-handling/web-services/test-cases/tc-ws-10a-C-BRT.md)
**Current status**: FAIL — last run 2026-04-06 (BRT)
**Bug surface**: CB-8 — UTC→BRT shift (-3h)

## Run History

| Run | Date       | TZ  | Outcome | File                                              |
| --- | ---------- | --- | ------- | ------------------------------------------------- |
| 1   | 2026-04-06 | BRT | FAIL    | [ws-10-batch-run-1](../runs/ws-10-batch-run-1.md) |

## Current Interpretation

Config C (DateTime, ignoreTZ=false) shows UTC→local time shift. API-stored Z suffix causes Forms V1 to convert 14:30 UTC to 11:30 AM BRT. Same behavior as WS-4-C-BRT (putForms). Confirms CB-8 applies to postForms endpoint.

## Next Action

Document as cross-layer design issue. See WS-10C-C-BRT for save-stabilize behavior.
