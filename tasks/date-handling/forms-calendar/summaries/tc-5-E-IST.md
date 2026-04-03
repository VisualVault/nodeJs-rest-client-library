# TC-5-E-IST — Summary

**Spec**: [tc-5-E-IST.md](../test-cases/tc-5-E-IST.md)
**Current status**: FAIL — last run 2026-04-03 (IST)
**Bug surface**: Bug #7 — preset date stores Feb 28 instead of Mar 1 in IST

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | IST | FAIL-3  | [run-1](../runs/tc-5-E-IST-run-1.md) |

## Current Interpretation

Bug #7 confirmed on legacy preset init path for Config E in IST. `parseDateString(initialDate, false, true)` → strips Z → `moment(...)` parses as IST local → `.startOf('day')` → IST midnight March 1 = UTC Feb 28 18:30. Save extraction would store `"2026-02-28"`. `useLegacy=true` does not protect against Bug #7 — the `parseDateString` code is shared between legacy and non-legacy. Same behavior as non-legacy 5-A-IST.

## Next Action

No further action — Bug #7 fully characterized for date-only presets across all configs (A, B, E, F) in IST.
