# TC-7-B-dateObj-IST — Summary

**Spec**: [tc-7-B-dateObj-IST.md](../test-cases/tc-7-B-dateObj-IST.md)
**Current status**: FAIL-1 — last run 2026-04-03 (IST)
**Bug surface**: Bug #7 — Date object double-shift stores -2 days in UTC+

## Run History

| Run | Date       | TZ  | Outcome | File                                         |
| --- | ---------- | --- | ------- | -------------------------------------------- |
| 1   | 2026-04-03 | IST | FAIL-1  | [run-1](../runs/tc-7-B-dateObj-IST-run-1.md) |

## Current Interpretation

Bug #7 double-shift confirmed for Config B Date object in IST. `new Date(2026, 2, 15)` stores `"2026-03-13"` (-2 days). Identical to Config A dateObj-IST — `ignoreTimezone=true` provides no protection. The double-shift is unique to Date object input; string input shows -1 day.

## Next Action

Re-run after Bug #7 fix deployed.
