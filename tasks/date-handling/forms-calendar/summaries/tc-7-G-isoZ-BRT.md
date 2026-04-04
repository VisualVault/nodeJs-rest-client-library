# TC-7-G-isoZ-BRT — Summary

**Spec**: [tc-7-G-isoZ-BRT.md](../test-cases/tc-7-G-isoZ-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — UTC→local shift correct, GFV returns raw

## Run History

| Run | Date       | TZ  | Outcome | File                                      |
| --- | ---------- | --- | ------- | ----------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-7-G-isoZ-BRT-run-1.md) |

## Current Interpretation

Config G legacy DateTime with isoZ input stores correctly in BRT. UTC→local shift produces expected `T21:00:00` (midnight UTC minus 3h). GFV returns raw without UTC reconversion (unlike Config C). Key G vs C comparison point.

## Next Action

No further action — closed PASS.
