# TC-5-B-IST — Summary

**Spec**: [tc-5-B-IST.md](../test-cases/tc-5-B-IST.md)
**Current status**: FAIL — last run 2026-04-03 (IST)
**Bug surface**: Bug #7 — preset date stores Feb 28 instead of Mar 1 in IST

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | IST | FAIL-3  | [run-1](../runs/tc-5-B-IST-run-1.md) |

## Current Interpretation

Bug #7 confirmed on preset init path for Config B in IST. `parseDateString(initialDate, false, true)` → strips Z → `moment(...)` parses as IST local → `.startOf('day')` → IST midnight March 1 = UTC Feb 28 18:30. Save extraction would store `"2026-02-28"`. Display shows correct local date (`03/01/2026`), masking the corruption. `ignoreTimezone=true` on the field provides no protection (Bug #3 hardcodes the same value). Same behavior as 5-A-IST.

## Next Action

No further action — Bug #7 fully characterized for date-only presets in IST across Config A and B. The bug is config-independent for date-only fields.
