# TC-1-F-BRT — Summary

**Spec**: [tc-1-F-BRT.md](../test-cases/tc-1-F-BRT.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: Legacy format — useLegacy=true popup stores full UTC datetime; ignoreTZ=true has no effect on legacy path

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | BRT | FAIL-1  | [run-1](../runs/tc-1-F-BRT-run-1.md) |
| 2   | 2026-04-06 | BRT | FAIL-1  | [run-2](../runs/tc-1-F-BRT-run-2.md) |
| 3   | 2026-04-09 | BRT | FAIL    | [run-3](../runs/tc-1-F-BRT-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Bug #2 audit complete. Run-2 (Playwright automated, 2026-04-06) confirms run-1 (manual, 2026-03-31). Dual-method verification achieved.
