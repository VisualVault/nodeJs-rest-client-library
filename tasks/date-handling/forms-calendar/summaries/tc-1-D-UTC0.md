# TC-1-D-UTC0 — Summary

**Spec**: [tc-1-D-UTC0.md](../test-cases/tc-1-D-UTC0.md)
**Current status**: FAIL — last run 2026-04-09 (UTC0, Chromium)
**Bug surface**: Bug #5 present in code but zero-drift at UTC+0 (fake Z coincidentally correct)

## Run History

| Run | Date       | TZ    | Outcome | File                                  |
| --- | ---------- | ----- | ------- | ------------------------------------- |
| 1   | 2026-03-31 | UTC+0 | PASS    | [run-1](../runs/tc-1-D-UTC0-run-1.md) |
| 2   | 2026-04-03 | UTC0  | FAIL    | [run-2](../runs/tc-1-D-UTC0-run-2.md) |
| 3   | 2026-04-03 | UTC0  | FAIL    | [run-3](../runs/tc-1-D-UTC0-run-3.md) |
| 3   | 2026-04-09 | UTC0  | FAIL    | [run-3](../runs/tc-1-D-UTC0-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No re-run needed. UTC+0 control role is fulfilled. The PASS outcome must be interpreted carefully — it does not indicate absence of Bug #5 in the codebase.
