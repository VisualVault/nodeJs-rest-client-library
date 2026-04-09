# TC-2-G-BRT — Summary

**Spec**: [tc-2-G-BRT.md](../test-cases/tc-2-G-BRT.md)
**Current status**: PASS — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: Bug #2 (inconsistent popup vs typed handlers) — typed input stores local time via `getSaveValue()`; popup stores raw UTC ISO

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | BRT | PASS    | [run-1](../runs/tc-2-G-BRT-run-1.md) |
| 2   | 2026-04-03 | BRT | PASS    | [run-2](../runs/tc-2-G-BRT-run-2.md) |
| 3   | 2026-04-09 | BRT | PASS    | [run-3](../runs/tc-2-G-BRT-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): PASS. Cross-browser verification in progress.

## Next Action

Run 2-H-BRT (sibling — ignoreTZ variant) to confirm ignoreTZ is no-op on typed input path.
