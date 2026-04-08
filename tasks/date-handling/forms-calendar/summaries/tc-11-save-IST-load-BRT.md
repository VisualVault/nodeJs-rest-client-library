# TC-11-save-IST-load-BRT — Summary

**Spec**: [tc-11-save-IST-load-BRT.md](../test-cases/tc-11-save-IST-load-BRT.md)
**Current status**: PASS — last run 2026-04-08 (BRT, Playwright CLI)
**Bug surface**: FORM-BUG-7 (pre-existing IST save corruption in Config A), FORM-BUG-5 (fake Z on Config D GFV)

## Run History

| Run | Date       | TZ  | Outcome | File                                              |
| --- | ---------- | --- | ------- | ------------------------------------------------- |
| 1   | 2026-04-08 | BRT | PASS    | [run-1](../runs/tc-11-save-IST-load-BRT-run-1.md) |

## Current Interpretation

Cross-TZ load from IST to BRT does not introduce new corruption. Config A raw `"2026-03-14"` was corrupted when saved from IST (FORM-BUG-7 shifted Mar 15 to Mar 14 at input time). Config D raw preserved; GFV adds fake Z (FORM-BUG-5). The load path is innocent — corruption is at save time.

## Next Action

No further action — closed PASS for load integrity.
