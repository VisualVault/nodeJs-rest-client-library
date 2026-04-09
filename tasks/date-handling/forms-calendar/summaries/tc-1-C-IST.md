# TC-1-C-IST — Summary

**Spec**: [tc-1-C-IST.md](../test-cases/tc-1-C-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: none — Config C (ignoreTZ=false, enableTime=true) stores and retrieves correctly in IST

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-30 | IST | PASS    | [run-1](../runs/tc-1-C-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-1-C-IST-run-2.md) |
| 3   | 2026-04-09 | IST | FAIL    | [run-3](../runs/tc-1-C-IST-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No re-run needed. Config C remains the stable DateTime reference across all tested timezones. Use as comparison baseline when verifying Config D IST results.
