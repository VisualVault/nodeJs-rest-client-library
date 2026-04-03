# TC-6-C-BRT — Summary

**Spec**: [tc-6-C-BRT.md](../test-cases/tc-6-C-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — DateTime current date stores real UTC

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-6-C-BRT-run-1.md) |

## Current Interpretation

Config C DateTime Current Date stores correct UTC timestamp. GFV returns real UTC ISO (`new Date(value).toISOString()`). No transformation bugs. Compare with Config D (6-D-BRT FAIL — Bug #5).

## Next Action

Test 6-C-IST for IST coverage.
