# TC-8-D-empty-IST — Summary

**Spec**: [tc-8-D-empty-IST.md](../test-cases/tc-8-D-empty-IST.md)
**Current status**: FAIL — last run 2026-04-01 (IST)
**Bug surface**: Bug #6 — GetFieldValue returns "Invalid Date" for empty Config D field

## Run History

| Run | Date       | TZ  | Outcome | File                                       |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| 1   | 2026-04-01 | IST | FAIL    | [run-1](../runs/tc-8-D-empty-IST-run-1.md) |

## Current Interpretation

Bug #6 is confirmed TZ-independent. An empty Config D field (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) returns `"Invalid Date"` from GetFieldValue in IST, matching the BRT result. The bug is purely config-driven — the `getCalendarFieldValue()` code path that produces `"Invalid Date"` is triggered by the field's configuration flags, not by the browser's timezone. This means Bug #6 affects all users globally when the field is empty.

## Next Action

No further TZ runs needed for Bug #6 scope — it is universally confirmed. Focus on characterizing the fix (guard clause in `getCalendarFieldValue()`).
