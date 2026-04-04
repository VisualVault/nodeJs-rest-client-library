# TC-8-F — Summary

**Spec**: [tc-8-F.md](../test-cases/tc-8-F.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Chromium)
**Bug surface**: none — legacy date-only + ignoreTZ returns raw unchanged

## Run History

| Run | Date       | TZ  | Outcome | File                             |
| --- | ---------- | --- | ------- | -------------------------------- |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-8-F-run-1.md) |

## Current Interpretation

Legacy date-only + ignoreTZ Config F GFV returns raw string unchanged. Both `useLegacy` and `ignoreTimezone` flags are inert for date-only GFV. All 4 date-only configs (A, B, E, F) confirmed identical.

## Next Action

No further action — date-only GFV matrix complete.
