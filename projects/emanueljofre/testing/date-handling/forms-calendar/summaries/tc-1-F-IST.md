# TC-1-F-IST — Summary

**Spec**: [tc-1-F-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-1-F-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: none — control/passing scenario; ignoreTZ is a no-op on legacy popup path

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | PASS    | [run-1](../runs/tc-1-F-IST-run-1.md) |
| 2   | 2026-04-09 | IST | FAIL    | [run-2](../runs/tc-1-F-IST-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Run 2-F-IST (typed input, Config F, IST) to determine whether the legacy typed input path matches the popup (same UTC datetime) or diverges (date-only string), which would confirm Bug #2 on the legacy path under IST.
