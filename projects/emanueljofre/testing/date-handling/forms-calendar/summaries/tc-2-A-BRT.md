# TC-2-A-BRT — Summary

**Spec**: [tc-2-A-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-2-A-BRT.md)
**Current status**: PASS — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: none — BRT is UTC-3, no shift on date-only fields

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-2-A-BRT-run-1.md) |
| 2   | 2026-04-01 | BRT | PASS    | [run-2](../runs/tc-2-A-BRT-run-2.md) |
| 3   | 2026-04-03 | BRT | PASS    | [run-3](../runs/tc-2-A-BRT-run-3.md) |
| 4   | 2026-04-09 | BRT | PASS    | [run-4](../runs/tc-2-A-BRT-run-4.md) |

## Current Interpretation

Run 4 (2026-04-09, Chromium): PASS. Cross-browser verification in progress.

## Next Action

No re-run needed for BRT. Sibling IST test (tc-2-A-IST.md) confirms Bug #7 manifests for typed input in UTC+ timezones.
