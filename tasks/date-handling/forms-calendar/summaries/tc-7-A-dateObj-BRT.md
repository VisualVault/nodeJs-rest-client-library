# TC-7-A-dateObj-BRT — Summary

**Spec**: [tc-7-A-dateObj-BRT.md](../test-cases/tc-7-A-dateObj-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — BRT control for Date object input

## Run History

| Run | Date       | TZ  | Outcome | File                                         |
| --- | ---------- | --- | ------- | -------------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-7-A-dateObj-BRT-run-1.md) |

## Current Interpretation

Date object input `new Date(2026, 2, 15)` stores correctly in BRT. No bugs fire for Config A date-only in UTC- timezones. This is the BRT control for the IST sibling (`7-A-dateObj-IST`) which confirmed Bug #7 double-shift (-2 days).

## Next Action

No further action — closed PASS. Run IST/UTC0 siblings if needed for full TZ coverage.
