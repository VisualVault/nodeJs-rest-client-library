# TC-11-B-save-BRT-load-IST — Summary

**Spec**: [tc-11-B-save-BRT-load-IST.md](../test-cases/tc-11-B-save-BRT-load-IST.md)
**Current status**: PASS — last run 2026-04-08 (IST, Playwright CLI)
**Bug surface**: none — ignoreTZ irrelevant for date-only load

## Run History

| Run | Date       | TZ  | Outcome | File                                                |
| --- | ---------- | --- | ------- | --------------------------------------------------- |
| 1   | 2026-04-08 | IST | PASS    | [run-1](../runs/tc-11-B-save-BRT-load-IST-run-1.md) |

## Current Interpretation

Same pattern as 11-A. Config B (date-only + ignoreTimezone) survives cross-TZ load. ignoreTZ is irrelevant for date-only fields on load — initCalendarValueV1 preserves the stored string without re-parsing.

## Next Action

No further action — closed PASS.
