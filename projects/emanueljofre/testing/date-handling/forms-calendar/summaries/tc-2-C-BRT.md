# TC-2-C-BRT — Summary

**Spec**: [tc-2-C-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-2-C-BRT.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: none

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-2-C-BRT-run-1.md) |
| 2   | 2026-04-03 | BRT | FAIL    | [run-2](../runs/tc-2-C-BRT-run-2.md) |
| 3   | 2026-04-09 | BRT | FAIL    | [run-3](../runs/tc-2-C-BRT-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Run 2-C-IST to observe DateTime typed input behavior under UTC+ offset. Pending — IST DateTime typed input prediction revised to expect `"2026-03-15T00:00:00"` based on confirmed 1-C-IST behavior (getSaveValue formats local time).
