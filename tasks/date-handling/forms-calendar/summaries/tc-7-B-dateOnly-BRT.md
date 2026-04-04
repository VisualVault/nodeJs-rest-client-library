# TC-7-B-dateOnly-BRT — Summary

**Spec**: [tc-7-B-dateOnly-BRT.md](../test-cases/tc-7-B-dateOnly-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — BRT control, ignoreTZ inert on date-only

## Run History

| Run | Date       | TZ  | Outcome | File                                          |
| --- | ---------- | --- | ------- | --------------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-7-B-dateOnly-BRT-run-1.md) |

## Current Interpretation

Config B date-only identical to Config A in BRT. `ignoreTimezone=true` has no effect on the `normalizeCalValue()` → `getSaveValue()` path for date-only fields. BRT control for IST sibling.

## Next Action

No further action — closed PASS.
