# TC-8-B-BRT — Summary

**Spec**: [tc-8-B-BRT.md](../test-cases/tc-8-B-BRT.md)
**Current status**: PASS — last run 2026-04-01 (BRT)
**Bug surface**: none

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-01 | BRT | PASS    | [run-1](../runs/tc-8-B-BRT-run-1.md) |

## Current Interpretation

Config B (`enableTime=false, ignoreTimezone=true, useLegacy=false`) returns the raw stored value unchanged from GetFieldValue. The `ignoreTZ` flag has no effect on date-only GFV output — the `getCalendarFieldValue()` code path for `enableTime=false` returns raw values directly, bypassing the transformation logic where Bug #5 and Bug #6 live. This confirms all date-only configs (A, B, E, F) are safe from GFV output bugs.

## Next Action

No further action for this TC — closed PASS. TZ-invariant behavior expected; no need for IST/UTC0 runs unless validating cross-TZ matrix.
