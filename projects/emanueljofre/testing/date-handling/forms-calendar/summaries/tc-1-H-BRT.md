# TC-1-H-BRT — Summary

**Spec**: [tc-1-H-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-1-H-BRT.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: Legacy format — useLegacy=true popup stores UTC datetime; ignoreTZ=true + enableTime=true both inert on legacy path

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | BRT | FAIL-1  | [run-1](../runs/tc-1-H-BRT-run-1.md) |
| 2   | 2026-04-06 | BRT | FAIL-1  | [run-2](../runs/tc-1-H-BRT-run-2.md) |
| 3   | 2026-04-09 | BRT | FAIL    | [run-3](../runs/tc-1-H-BRT-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Bug #2 audit complete. Run-2 (Playwright automated, 2026-04-06) confirms run-1 (manual, 2026-03-31). Dual-method verification achieved.
