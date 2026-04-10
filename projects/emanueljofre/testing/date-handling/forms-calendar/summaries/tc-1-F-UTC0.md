# TC-1-F-UTC0 — Summary

**Spec**: [tc-1-F-UTC0.md](tasks/date-handling/forms-calendar/test-cases/tc-1-F-UTC0.md)
**Current status**: FAIL — last run 2026-04-09 (UTC0, Chromium)
**Bug surface**: Legacy format — stores UTC datetime instead of date-only; ignoreTZ no-op confirmed; date correct at UTC+0

## Run History

| Run | Date       | TZ    | Outcome | File                                  |
| --- | ---------- | ----- | ------- | ------------------------------------- |
| 1   | 2026-03-31 | UTC+0 | FAIL-1  | [run-1](../runs/tc-1-F-UTC0-run-1.md) |
| 2   | 2026-04-09 | UTC0  | FAIL    | [run-2](../runs/tc-1-F-UTC0-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No further action for Category 1. All 20 slots complete (8 PASS, 12 FAIL). Next priority: Category 2 legacy tests or remaining non-legacy categories.
