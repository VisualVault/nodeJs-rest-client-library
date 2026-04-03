# TC-6-C-IST — Summary

**Spec**: [tc-6-C-IST.md](../test-cases/tc-6-C-IST.md)
**Current status**: PASS — last run 2026-04-03 (IST, Firefox)
**Bug surface**: none — DateTime current date stores real UTC; GFV returns real UTC ISO

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | IST | PASS    | [run-1](../runs/tc-6-C-IST-run-1.md) |

## Current Interpretation

Config C DateTime Current Date stores correct UTC timestamp in IST. GFV returns real UTC ISO (`new Date(value).toISOString()`). No transformation bugs. Compare with 6-D-IST (FAIL — Bug #5 fake Z adds +5:30h shift).

## Next Action

No further action. Config C Current Date verified clean across BRT and IST.
