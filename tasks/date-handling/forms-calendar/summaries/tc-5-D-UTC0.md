# TC-5-D-UTC0 — Summary

**Spec**: [tc-5-D-UTC0.md](../test-cases/tc-5-D-UTC0.md)
**Current status**: FAIL — last run 2026-04-03 (UTC0)
**Bug surface**: Bug #5 — fake Z structurally present but numerically invisible at UTC+0

## Run History

| Run | Date       | TZ   | Outcome | File                                  |
| --- | ---------- | ---- | ------- | ------------------------------------- |
| 1   | 2026-04-03 | UTC0 | FAIL-3  | [run-1](../runs/tc-5-D-UTC0-run-1.md) |

## Current Interpretation

Bug #5 confirmed at UTC+0 — GFV returns `"2026-03-01T11:28:54.627Z"` (fake Z) which numerically matches the real UTC ISO string because local = UTC at this timezone. The bug is architecturally identical to BRT and IST but the shift is 0h. Round-trips are stable (0h drift). Config D preset TZ matrix complete: BRT (FAIL, -3h), IST (FAIL, +5:30h), UTC0 (FAIL, 0h — invisible).

## Next Action

No further action — Config D preset TZ matrix complete. Bug #5 confirmed across all 3 TZs with varying shift magnitudes.
