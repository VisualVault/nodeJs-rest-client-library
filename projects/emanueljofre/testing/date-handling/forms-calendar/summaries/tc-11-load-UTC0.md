# TC-11-load-UTC0 — Summary

**Spec**: [tc-11-load-UTC0.md](tasks/date-handling/forms-calendar/test-cases/tc-11-load-UTC0.md)
**Current status**: FAIL — last run 2026-04-09 (UTC0, Chromium)
**Bug surface**: FORM-BUG-5 present but invisible (fake Z coincidentally correct at UTC+0)

## Run History

| Run | Date       | TZ    | Outcome | File                                      |
| --- | ---------- | ----- | ------- | ----------------------------------------- |
| 1   | 2026-04-08 | UTC+0 | PASS    | [run-1](../runs/tc-11-load-UTC0-run-1.md) |
| 2   | 2026-04-09 | UTC0  | FAIL    | [run-2](../runs/tc-11-load-UTC0-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No further action — closed PASS. Bug #5 masked at UTC+0 is a known characteristic, not a fix.
