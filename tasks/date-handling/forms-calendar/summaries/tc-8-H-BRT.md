# TC-8-H-BRT — Summary

**Spec**: [tc-8-H-BRT.md](../test-cases/tc-8-H-BRT.md)
**Current status**: PASS — last run 2026-04-01 (BRT)
**Bug surface**: none — control test confirming Bug #5 is absent for useLegacy=true

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-01 | BRT | PASS    | [run-1](../runs/tc-8-H-BRT-run-1.md) |

## Current Interpretation

Config H (`useLegacy=true`, `enableTime=true`, `ignoreTimezone=true`) returns the raw stored value unchanged from GetFieldValue. The `!useLegacy` guard in `getCalendarFieldValue()` prevents the fake-Z addition that affects Config D. This confirms Bug #5 is scoped to `useLegacy=false` configs only. Zero round-trip drift for Config H.

## Next Action

No further action for this TC — closed PASS. Run 8-H-empty next to test whether `useLegacy=true` also prevents Bug #6 (Invalid Date for empty fields).
