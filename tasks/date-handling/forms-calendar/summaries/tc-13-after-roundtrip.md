# TC-13-after-roundtrip — Summary

**Spec**: [tc-13-after-roundtrip.md](../test-cases/tc-13-after-roundtrip.md)
**Current status**: FAIL — last run 2026-04-08 (BRT)
**Bug surface**: FORM-BUG-5 — round-trip drift persists to database

## Run History

| Run | Date       | TZ  | Outcome | File                                            |
| --- | ---------- | --- | ------- | ----------------------------------------------- |
| 1   | 2026-04-08 | BRT | FAIL    | [run-1](../runs/tc-13-after-roundtrip-run-1.md) |

## Current Interpretation

FORM-BUG-5 round-trip drift is not a transient client-side issue — it persists through the save pipeline to the database. After 1 round-trip in BRT, the stored value shifts from `T00:00:00` to `T21:00:00` (previous day, 9 PM). This has direct operational impact: any script that reads and writes back a date value will permanently corrupt it.

## Next Action

Re-run after FORM-BUG-5 fix deployed. Verify round-trip produces 0 drift in DB.
