# TC-1-A-UTC0 — Summary

**Spec**: [tc-1-A-UTC0.md](../tc-1-A-UTC0.md)
**Current status**: PASS — last run 2026-03-30 (UTC+0)
**Bug surface**: none — control scenario; Bug #7 zero-drift at UTC+0

## Run History

| Run | Date       | TZ    | Outcome | File                                  |
| --- | ---------- | ----- | ------- | ------------------------------------- |
| 1   | 2026-03-30 | UTC+0 | PASS    | [run-1](../runs/tc-1-A-UTC0-run-1.md) |

## Current Interpretation

Config A (date-only, ignoreTZ=false, modern path) at UTC+0 stores and returns `"2026-03-15"` correctly. This is the expected outcome: at UTC+0, local midnight equals UTC midnight, so `getSaveValue()`'s UTC date extraction produces the correct calendar day — the Bug #7 mechanism is present in the code but the offset is zero, making the error invisible. This run serves as the zero-drift control for Bug #7, completing the three-timezone triangle: BRT PASS (UTC-3, same-day UTC midnight), UTC+0 PASS (zero offset), IST FAIL (UTC+5:30, previous-day UTC midnight). The control confirms Bug #7 is timezone-dependent and proportional to UTC offset.

## Next Action

No re-run needed. UTC+0 control role is fulfilled. Results are stable across all date-only configs at UTC+0.
