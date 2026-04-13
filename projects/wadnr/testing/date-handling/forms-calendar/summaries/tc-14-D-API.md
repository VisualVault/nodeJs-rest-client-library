# TC-14-D-API — Summary

**Spec**: [tc-14-D-API.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-D-API.md)
**Current status**: PASS — last run 2026-04-13 (BRT)
**Bug surface**: none — **identical to Config C at server level**

## Run History

| Run | Date       | TZ  | Outcome | File                                    |
| --- | ---------- | --- | ------- | --------------------------------------- |
| 1   | 2026-04-13 | BRT | PASS    | [run-1](../runs/tc-14-D-API-run-1.md) |

## Current Interpretation

Server stores Config C and Config D identically — `ignoreTimezone` has no effect at API level. Key finding for WADNR: FORM-BUG-5 (client-side fake Z) does not affect server storage. The bug is purely a client-side GetFieldValue issue.

## Next Action

Run Phase C (expected identical — mask and ignoreTimezone have no effect at API level).
