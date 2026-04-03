# TC-6-E-IST — Summary

**Spec**: [tc-6-E-IST.md](../test-cases/tc-6-E-IST.md)
**Current status**: PASS — last run 2026-04-03 (IST, Firefox)
**Bug surface**: none — `new Date()` bypasses all parsing bugs including Bug #7

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | IST | PASS    | [run-1](../runs/tc-6-E-IST-run-1.md) |

## Current Interpretation

Config E legacy Current Date correct in IST. KEY: No Bug #7 — unlike preset 5-E-IST (FAIL), Current Date uses `new Date()` directly, bypassing `moment(e).toDate()` parsing entirely. `useLegacy=true` is inert on the init path. All date-only Current Date configs pass in IST.

## Next Action

No further action. Bug #7 absence on Current Date path confirmed — the distinction between preset and current date init paths is verified.
