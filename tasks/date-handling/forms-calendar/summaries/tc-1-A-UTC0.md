# TC-1-A-UTC0 — Summary

**Spec**: [tc-1-A-UTC0.md](../test-cases/tc-1-A-UTC0.md)
**Current status**: FAIL — last run 2026-04-09 (UTC0, Chromium)
**Bug surface**: none — control scenario; Bug #7 zero-drift at UTC+0

## Run History

| Run | Date       | TZ    | Outcome | File                                  |
| --- | ---------- | ----- | ------- | ------------------------------------- |
| 1   | 2026-03-30 | UTC+0 | PASS    | [run-1](../runs/tc-1-A-UTC0-run-1.md) |
| 2   | 2026-04-03 | UTC0  | PASS    | [run-2](../runs/tc-1-A-UTC0-run-2.md) |
| 3   | 2026-04-03 | UTC0  | PASS    | [run-3](../runs/tc-1-A-UTC0-run-3.md) |
| 3   | 2026-04-09 | UTC0  | FAIL    | [run-3](../runs/tc-1-A-UTC0-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No re-run needed. UTC+0 control role is fulfilled. Results are stable across all date-only configs at UTC+0.
