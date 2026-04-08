# TC-11-A-save-BRT-load-IST — Summary

**Spec**: [tc-11-A-save-BRT-load-IST.md](../test-cases/tc-11-A-save-BRT-load-IST.md)
**Current status**: PASS — last run 2026-04-08 (IST, Playwright CLI)
**Bug surface**: none — control/passing

## Run History

| Run | Date       | TZ  | Outcome | File                                                |
| --- | ---------- | --- | ------- | --------------------------------------------------- |
| 1   | 2026-04-08 | IST | PASS    | [run-1](../runs/tc-11-A-save-BRT-load-IST-run-1.md) |

## Current Interpretation

Date-only raw values survive cross-TZ server round-trips. FORM-BUG-7 fires at input/save time, not load time. Matrix prediction corrected. initCalendarValueV1 preserves the stored string value without re-parsing date-only strings through moment().toDate() on load.

## Next Action

No further action — closed PASS.
