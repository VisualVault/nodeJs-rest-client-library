# TC-11-D-save-BRT-load-IST — Summary

**Spec**: [tc-11-D-save-BRT-load-IST.md](../test-cases/tc-11-D-save-BRT-load-IST.md)
**Current status**: PASS — last run 2026-04-09 (IST, Chromium)
**Bug surface**: FORM-BUG-5 (fake Z on GetFieldValue)

## Run History

| Run | Date       | TZ  | Outcome | File                                                |
| --- | ---------- | --- | ------- | --------------------------------------------------- |
| 1   | 2026-04-09 | IST | FAIL-1  | [run-1](../runs/tc-11-D-save-BRT-load-IST-run-1.md) |
| 2   | 2026-04-09 | IST | PASS    | [run-2](../runs/tc-11-D-save-BRT-load-IST-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): PASS. Cross-browser verification in progress.

## Next Action

Re-run after FORM-BUG-5 fix deployed. Config H (tc-11-H-save-BRT-load-IST) serves as the control — same flags with `useLegacy=true` bypasses the bug.
