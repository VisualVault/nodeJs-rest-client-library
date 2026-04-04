# TC-7-C-dateObj — Summary

**Spec**: [tc-7-C-dateObj.md](../test-cases/tc-7-C-dateObj.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Chromium)
**Bug surface**: none — Config C control, Date object input

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-7-C-dateObj-run-1.md) |

## Current Interpretation

`new Date(2026,2,15)` creates local BRT midnight directly. Stored as `"2026-03-15T00:00:00"`, GFV returns real UTC `"2026-03-15T03:00:00.000Z"`. No double-shift (Bug #7 absent for DateTime configs). Config C handles Date objects cleanly.

## Next Action

No further action — behavior characterized.
