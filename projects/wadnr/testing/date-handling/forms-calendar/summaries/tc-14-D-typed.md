# TC-14-D-typed — Summary

**Spec**: [tc-14-D-typed.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-D-typed.md)
**Current status**: FAIL-3 — last run 2026-04-13 (BRT)
**Bug surface**: FORM-BUG-5 — GetFieldValue appends fake Z to local time

## Run History

| Run | Date       | TZ  | Outcome | File                                      |
| --- | ---------- | --- | ------- | ----------------------------------------- |
| 1   | 2026-04-13 | BRT | FAIL-3  | [run-1](../runs/tc-14-D-typed-run-1.md) |

## Current Interpretation

Same storage as Config C but GetFieldValue appends fake Z suffix. Typed input correctly stores local midnight, but the ignoreTimezone flag triggers the erroneous Z append on read-back via GFV.

## Next Action

Run Phase C after mask addition.
