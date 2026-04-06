# TC-WS-10A-D-IST — Summary

**Spec**: [tc-ws-10a-D-IST.md](../test-cases/tc-ws-10a-D-IST.md)
**Current status**: FAIL — last run 2026-04-06 (IST)
**Bug surface**: CB-8 + Bug #5 + CB-11 — rawValue shifted +5:30h, display masked, GFV has fake Z
**Ticket**: Freshdesk #124697

## Run History

| Run | Date       | TZ  | Outcome | File                                              |
| --- | ---------- | --- | ------- | ------------------------------------------------- |
| 1   | 2026-04-06 | IST | FAIL    | [ws-10-batch-run-1](../runs/ws-10-batch-run-1.md) |

## Current Interpretation

Config D in IST — same pattern as BRT variant but with +5:30h shift. Display shows 02:30 PM (ignoreTZ), rawValue shifted to 20:00:00. GFV adds fake Z to shifted value. Confirms CB-8 is TZ-agnostic — the shift direction and magnitude follow the browser TZ.

## Next Action

IST save-stabilize not tested (only BRT). Could extend WS-10C to IST if needed.
