# TC-WS-10C-C-BRT — Summary

**Spec**: [tc-ws-10c-C-BRT.md](tasks/date-handling/web-services/test-cases/tc-ws-10c-C-BRT.md)
**Current status**: FAIL — last run 2026-04-06 (BRT)
**Bug surface**: CB-8 shift committed on save, stable afterward

## Run History

| Run | Date       | TZ  | Outcome | File                                              |
| --- | ---------- | --- | ------- | ------------------------------------------------- |
| 1   | 2026-04-06 | BRT | FAIL    | [ws-10-batch-run-1](../runs/ws-10-batch-run-1.md) |

## Current Interpretation

Config C save-and-stabilize: CB-8 shift (-3h) is visible on first open. Save commits the shifted value. No further mutation after first save (`stableAfterFirstSave: true`). Unlike Config D, the shift is visible immediately in the display (no ignoreTZ masking).

## Next Action

No further action — stabilize behavior documented.
