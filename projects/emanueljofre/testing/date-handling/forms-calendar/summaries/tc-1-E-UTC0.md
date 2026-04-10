# TC-1-E-UTC0 — Summary

**Spec**: [tc-1-E-UTC0.md](tasks/date-handling/forms-calendar/test-cases/tc-1-E-UTC0.md)
**Current status**: FAIL — last run 2026-04-09 (UTC0, Chromium)
**Bug surface**: Legacy format — stores UTC datetime instead of date-only; date component correct at UTC+0 (no shift)

## Run History

| Run | Date       | TZ    | Outcome | File                                  |
| --- | ---------- | ----- | ------- | ------------------------------------- |
| 1   | 2026-03-31 | UTC+0 | FAIL-1  | [run-1](../runs/tc-1-E-UTC0-run-1.md) |
| 2   | 2026-04-09 | UTC0  | FAIL    | [run-2](../runs/tc-1-E-UTC0-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Run tc-1-F-UTC0 (pending) to confirm ignoreTZ is a no-op at UTC+0 — expected `"2026-03-15T00:00:00.000Z"` (same as E-UTC0). This would complete all remaining Category 1 legacy slots.
