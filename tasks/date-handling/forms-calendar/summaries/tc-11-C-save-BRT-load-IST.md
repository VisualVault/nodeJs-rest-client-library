# TC-11-C-save-BRT-load-IST — Summary

**Spec**: [tc-11-C-save-BRT-load-IST.md](../test-cases/tc-11-C-save-BRT-load-IST.md)
**Current status**: PASS — last run 2026-04-08 (IST, Playwright CLI)
**Bug surface**: none (structural limitation, not bug)

## Run History

| Run | Date       | TZ  | Outcome | File                                                |
| --- | ---------- | --- | ------- | --------------------------------------------------- |
| 1   | 2026-04-08 | IST | PASS    | [run-1](../runs/tc-11-C-save-BRT-load-IST-run-1.md) |

## Current Interpretation

Config C DateTime raw values survive cross-TZ load. GFV re-interprets the timezone-ambiguous value in the loading TZ (IST midnight `"2026-03-14T18:30:00.000Z"` vs BRT midnight `"2026-03-15T03:00:00.000Z"`). This is a design limitation of storing local time without timezone info, not a load-time bug.

## Next Action

No further action — closed PASS. Structural limitation documented.
