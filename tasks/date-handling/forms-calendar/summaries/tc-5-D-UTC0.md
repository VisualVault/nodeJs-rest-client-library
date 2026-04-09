# TC-5-D-UTC0 — Summary

**Spec**: [tc-5-D-UTC0.md](../test-cases/tc-5-D-UTC0.md)
**Current status**: FAIL — last run 2026-04-09 (UTC0, Chromium)
**Bug surface**: Bug #5 — fake Z structurally present but numerically invisible at UTC+0

## Run History

| Run | Date       | TZ   | Outcome | File                                  |
| --- | ---------- | ---- | ------- | ------------------------------------- |
| 1   | 2026-04-03 | UTC0 | FAIL-3  | [run-1](../runs/tc-5-D-UTC0-run-1.md) |
| 2   | 2026-04-09 | UTC0 | FAIL    | [run-2](../runs/tc-5-D-UTC0-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No further action — Config D preset TZ matrix complete. Bug #5 confirmed across all 3 TZs with varying shift magnitudes.
