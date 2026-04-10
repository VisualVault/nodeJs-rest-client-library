# TC-6-B-IST — Summary

**Spec**: [tc-6-B-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-6-B-IST.md)
**Current status**: PASS — last run 2026-04-09 (IST, Chromium)
**Bug surface**: none — ignoreTZ inert on current date path; cross-midnight edge demonstrated

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | IST | PASS    | [run-1](../runs/tc-6-B-IST-run-1.md) |
| 2   | 2026-04-09 | IST | PASS    | [run-2](../runs/tc-6-B-IST-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): PASS. Cross-browser verification in progress.

## Next Action

No further action. Cross-midnight edge verified. All date-only Current Date configs (A, B, E, F) pass in IST.
