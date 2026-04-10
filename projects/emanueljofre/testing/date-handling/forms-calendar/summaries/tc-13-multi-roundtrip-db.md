# TC-13-multi-roundtrip-db — Summary

**Spec**: [tc-13-multi-roundtrip-db.md](tasks/date-handling/forms-calendar/test-cases/tc-13-multi-roundtrip-db.md)
**Current status**: FAIL — last run 2026-04-08 (BRT)
**Bug surface**: FORM-BUG-5 — 8 round-trips = 1 full day lost in database

## Run History

| Run | Date       | TZ  | Outcome | File                                               |
| --- | ---------- | --- | ------- | -------------------------------------------------- |
| 1   | 2026-04-08 | BRT | FAIL    | [run-1](../runs/tc-13-multi-roundtrip-db-run-1.md) |

## Current Interpretation

The worst-case scenario for FORM-BUG-5 is confirmed at the database level. 8 `SetFieldValue(GetFieldValue())` round-trips in BRT produce exactly -24h drift — enough to change the calendar date by a full day. The drift is perfectly linear (-3h/trip) and persists through the save pipeline. This represents a real production risk for scripts that repeatedly read and write date fields.

## Next Action

Re-run after FORM-BUG-5 fix deployed. Verify 8 round-trips produce 0 drift in DB.
