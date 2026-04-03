# TC-5-A-IST — Summary

**Spec**: [tc-5-A-IST.md](../test-cases/tc-5-A-IST.md)
**Current status**: FAIL — last run 2026-04-03 (IST, Firefox)
**Bug surface**: Bug #7 — preset Date object has wrong UTC date in IST

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-01 | IST | FAIL-3  | [run-1](../runs/tc-5-A-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-5-A-IST-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): FAIL. Cross-browser verification in progress.

## Next Action

Run 8-A-empty (Bug #6 scope) or 8B-D-BRT (GDOC safe API) to continue closing assessment gaps. After assessment, re-run after Bug #7 fix deployed to verify preset path is fixed.
