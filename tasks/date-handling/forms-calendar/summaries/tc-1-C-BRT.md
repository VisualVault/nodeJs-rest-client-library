# TC-1-C-BRT — Summary

**Spec**: [tc-1-C-BRT.md](../test-cases/tc-1-C-BRT.md)
**Current status**: PASS — last run 2026-03-27 (BRT)
**Bug surface**: none — Config C (ignoreTZ=false) uses proper UTC conversion; round-trip stable

## Run History

| Run | Date        | TZ  | Outcome | File                                 |
| --- | ----------- | --- | ------- | ------------------------------------ |
| 1   | ~2026-03-27 | BRT | PASS    | [run-1](../runs/tc-1-C-BRT-run-1.md) |

## Current Interpretation

Config C (DateTime, ignoreTZ=false, modern path) in BRT stores local midnight as `"2026-03-15T00:00:00"` and GetFieldValue returns the correct UTC conversion `"2026-03-15T03:00:00.000Z"`. This is the intended behavior: `getCalendarFieldValue()` uses `new Date(value).toISOString()` which produces a real UTC value that round-trips correctly through SetFieldValue. Config C is the stable DateTime reference — contrasted with Config D (same storage, but fake-Z in GetFieldValue causing drift). Round-trip confirmed stable in Test 2.3.

## Next Action

No re-run needed. Config C BRT is the stable DateTime baseline. Run tc-1-C-IST.md to verify IST behavior (expected: same storage, GetFieldValue returns correct UTC conversion for IST midnight).
