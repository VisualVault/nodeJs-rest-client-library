# TC-WS-10C-D-BRT — Summary

**Spec**: [tc-ws-10c-D-BRT.md](tasks/date-handling/web-services/test-cases/tc-ws-10c-D-BRT.md)
**Current status**: FAIL — last run 2026-04-06 (BRT)
**Bug surface**: CB-8 + CB-11 + Bug #5 — THE TICKET SCENARIO (Freshdesk #124697)
**Ticket**: Freshdesk #124697

## Run History

| Run | Date       | TZ  | Outcome | File                                              |
| --- | ---------- | --- | ------- | ------------------------------------------------- |
| 1   | 2026-04-06 | BRT | FAIL    | [ws-10-batch-run-1](../runs/ws-10-batch-run-1.md) |

## Current Interpretation

**This is the primary evidence for Freshdesk #124697.** Reproduces the exact customer-reported behavior:

1. API creates record with `T14:30:00`
2. First browser open: display `02:30 PM` (ignoreTZ preserves original DB value)
3. Save + reopen: display `11:30 AM` (shifted value is now the DB value)

The mutation is not caused by save — rawValue was already shifted on load. Save merely commits the shifted value. Display changes because `ignoreTZ` reads the new DB value on reopen.

`mutatedOnFirstSave: false` | `stableAfterFirstSave: true`

## Next Action

Use as primary evidence for ticket response. Consider extending to IST save-stabilize if additional cross-TZ evidence needed.
