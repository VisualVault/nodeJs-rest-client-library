# TC-3-D-BRT-BRT — Summary

**Spec**: [tc-3-D-BRT-BRT.md](../test-cases/tc-3-D-BRT-BRT.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: Bug #5 (fake Z in GetFieldValue) — confirmed active on reload path in Run 2

## Run History

| Run | Date       | TZ  | Outcome       | File                                     |
| --- | ---------- | --- | ------------- | ---------------------------------------- |
| 1   | 2026-03-27 | BRT | PASS          | [run-1](../runs/tc-3-D-BRT-BRT-run-1.md) |
| 2   | 2026-03-31 | BRT | PASS (FAIL-3) | [run-2](../runs/tc-3-D-BRT-BRT-run-2.md) |
| 3   | 2026-03-31 | BRT | PASS (FAIL-3) | [run-3](../runs/tc-3-D-BRT-BRT-run-3.md) |
| 4   | 2026-04-03 | BRT | FAIL          | [run-4](../runs/tc-3-D-BRT-BRT-run-4.md) |
| 5   | 2026-04-09 | BRT | FAIL          | [run-5](../runs/tc-3-D-BRT-BRT-run-5.md) |

## Current Interpretation

Run 5 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No further BRT-BRT runs needed. Run 3-D-BRT-IST to verify Config D cross-TZ behavior.
