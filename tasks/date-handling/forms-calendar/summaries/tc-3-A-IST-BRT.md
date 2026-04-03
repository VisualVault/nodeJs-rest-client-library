# TC-3-A-IST-BRT — Summary

**Spec**: [tc-3-A-IST-BRT.md](../test-cases/tc-3-A-IST-BRT.md)
**Current status**: FAIL — last run 2026-04-03 (BRT, Firefox)
**Bug surface**: Bug #7 — date-only wrong day baked in during IST save

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-01 | BRT | FAIL-3  | [run-1](../runs/tc-3-A-IST-BRT-run-1.md) |
| 2   | 2026-04-03 | BRT | FAIL    | [run-2](../runs/tc-3-A-IST-BRT-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): FAIL. Cross-browser verification in progress.

## Next Action

Run TC-3-B-IST-BRT to confirm `ignoreTZ` inertness for date-only in the IST→BRT direction. After that, all Config A/B cross-TZ reload tests will be complete.
