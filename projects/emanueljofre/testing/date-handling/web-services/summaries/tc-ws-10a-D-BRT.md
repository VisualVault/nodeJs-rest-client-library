# TC-WS-10A-D-BRT — Summary

**Spec**: [tc-ws-10a-D-BRT.md](tasks/date-handling/web-services/test-cases/tc-ws-10a-D-BRT.md)
**Current status**: FAIL — last run 2026-04-06 (BRT)
**Bug surface**: CB-8 + Bug #5 + CB-11 — display masked by ignoreTZ, rawValue shifted, GFV has fake Z
**Ticket**: Freshdesk #124697

## Run History

| Run | Date       | TZ  | Outcome | File                                              |
| --- | ---------- | --- | ------- | ------------------------------------------------- |
| 1   | 2026-04-06 | BRT | FAIL    | [ws-10-batch-run-1](../runs/ws-10-batch-run-1.md) |

## Current Interpretation

Config D (the ticket config) — display shows correct 02:30 PM (ignoreTZ preserves original DB value), but rawValue is already shifted to 11:30 AM (-3h). GFV adds fake Z to shifted value. This is the first-open state of the Freshdesk #124697 scenario. See WS-10C-D-BRT for the full mutation lifecycle.

## Next Action

See WS-10C-D-BRT for save-stabilize evidence. This is the primary evidence for Freshdesk #124697.
