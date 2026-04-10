# TC-11-load-Tokyo — Summary

**Spec**: [tc-11-load-Tokyo.md](tasks/date-handling/forms-calendar/test-cases/tc-11-load-Tokyo.md)
**Current status**: FAIL — last run 2026-04-08 (JST)
**Bug surface**: FORM-BUG-5 (+9h JST drift — largest positive offset tested)

## Run History

| Run | Date       | TZ  | Outcome | File                                       |
| --- | ---------- | --- | ------- | ------------------------------------------ |
| 1   | 2026-04-08 | JST | FAIL    | [run-1](../runs/tc-11-load-Tokyo-run-1.md) |

## Current Interpretation

Bug #5 +9h drift confirmed at JST (UTC+9) — the largest positive offset tested. Completes the TZ spectrum: BRT -3h, PDT -7h, PST -8h, UTC0 0h, IST +5:30h, JST +9h. Drift is always equal to the TZ offset, confirming the fake Z mechanism is purely TZ-proportional with no additional anomalies at large offsets.

## Next Action

No further action — FAIL confirmed. Completes Cat 11 TZ spectrum coverage.
