# TC-11-load-UTC0 — Summary

**Spec**: [tc-11-load-UTC0.md](../test-cases/tc-11-load-UTC0.md)
**Current status**: PASS — last run 2026-04-08 (UTC+0)
**Bug surface**: FORM-BUG-5 present but invisible (fake Z coincidentally correct at UTC+0)

## Run History

| Run | Date       | TZ    | Outcome | File                                      |
| --- | ---------- | ----- | ------- | ----------------------------------------- |
| 1   | 2026-04-08 | UTC+0 | PASS    | [run-1](../runs/tc-11-load-UTC0-run-1.md) |

## Current Interpretation

Config D round-trip at UTC+0 shows 0 drift. Bug #5 fake Z is present (GFV appends ".000Z") but coincidentally correct because UTC+0 local midnight = UTC midnight. This masks the bug — UTC+0 users never experience drift. Any non-zero TZ offset reveals it. Consistent with 12-utc-0-control.

## Next Action

No further action — closed PASS. Bug #5 masked at UTC+0 is a known characteristic, not a fix.
