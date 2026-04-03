# TC-2-A-BRT — Summary

**Spec**: [tc-2-A-BRT.md](../test-cases/tc-2-A-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Firefox)
**Bug surface**: none — BRT is UTC-3, no shift on date-only fields

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-2-A-BRT-run-1.md) |
| 2   | 2026-04-01 | BRT | PASS    | [run-2](../runs/tc-2-A-BRT-run-2.md) |
| 3   | 2026-04-03 | BRT | PASS    | [run-3](../runs/tc-2-A-BRT-run-3.md) |

## Current Interpretation

Run 3 (2026-04-03, Firefox): PASS. Cross-browser verification in progress.

## Next Action

No re-run needed for BRT. Sibling IST test (tc-2-A-IST.md) confirms Bug #7 manifests for typed input in UTC+ timezones.
