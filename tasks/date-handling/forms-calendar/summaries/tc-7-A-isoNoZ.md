# TC-7-A-isoNoZ — Summary

**Spec**: [tc-7-A-isoNoZ.md](../test-cases/tc-7-A-isoNoZ.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — BRT control for ISO without Z input

## Run History

| Run | Date       | TZ  | Outcome | File                                    |
| --- | ---------- | --- | ------- | --------------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-7-A-isoNoZ-run-1.md) |

## Current Interpretation

ISO string without Z suffix `"2026-03-15T00:00:00"` is parsed as local time by `moment()`. Time component stripped for date-only Config A. Stores `"2026-03-15"` correctly in BRT.

## Next Action

No further action — closed PASS.
