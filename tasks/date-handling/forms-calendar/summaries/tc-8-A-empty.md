# TC-8-A-empty — Summary

**Spec**: [tc-8-A-empty.md](../test-cases/tc-8-A-empty.md)
**Current status**: PASS — last run 2026-04-01 (BRT)
**Bug surface**: none — control test confirming Bug #6 is absent for Config A

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-01 | BRT | PASS    | [run-1](../runs/tc-8-A-empty-run-1.md) |

## Current Interpretation

Bug #6 ("Invalid Date" for empty fields) does not affect Config A (`enableTime=false`). The `getCalendarFieldValue()` code path for date-only fields returns the raw value unchanged, bypassing the `moment(value).format(...)` call that causes Bug #6 in Config D. This confirms Bug #6 requires `enableTime=true && ignoreTimezone=true` as analyzed. Config C (enableTime=true, ignoreTimezone=false) and legacy configs (E–H) remain untested for empty-field behavior.

## Next Action

No further action for this TC — closed PASS. Run 8-C-empty next to test whether `enableTime=true` alone (without `ignoreTimezone=true`) triggers Bug #6.
