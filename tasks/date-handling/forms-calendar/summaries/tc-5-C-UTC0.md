# TC-5-C-UTC0 — Summary

**Spec**: [tc-5-C-UTC0.md](../test-cases/tc-5-C-UTC0.md)
**Current status**: PASS — last run 2026-04-03 (UTC0)
**Bug surface**: none — DateTime preset TZ-independent (all 3 TZs produce identical values)

## Run History

| Run | Date       | TZ   | Outcome | File                                  |
| --- | ---------- | ---- | ------- | ------------------------------------- |
| 1   | 2026-04-03 | UTC0 | PASS    | [run-1](../runs/tc-5-C-UTC0-run-1.md) |

## Current Interpretation

Config C DateTime preset fully timezone-independent. BRT, IST, and UTC0 all produce identical raw (`"2026-03-31T11:29:14.181Z"`) and API (`"2026-03-31T11:29:14.181Z"`) values. Config C is the safest preset configuration across all tested timezones.

## Next Action

No further action — Config C preset TZ matrix complete (BRT, IST, UTC0 all PASS).
