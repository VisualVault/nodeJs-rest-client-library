# TC-2-F-IST — Summary

**Spec**: [tc-2-F-IST.md](../tc-2-F-IST.md)
**Current status**: FAIL-1 — last run 2026-03-31 (IST)
**Bug surface**: Bug #7 (date-only -1 day in UTC+), Bug #2 (legacy popup vs typed format inconsistency)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-2-F-IST-run-1.md) |

## Current Interpretation

Bug #7 confirmed for Config F (legacy, date-only, ignoreTZ=true) typed input in IST. The -1 day shift is identical to non-legacy configs A/B and sibling Config E (predicted). `ignoreTZ=true` has no effect on the date-only typed path — both E and F go through the same `getSaveValue()` strip logic. Bug #2 is also confirmed: the popup stores `"2026-03-14T18:30:00.000Z"` (raw UTC datetime) while typed input stores `"2026-03-14"` (date-only string), creating a format inconsistency for the same field depending on input method.

## Next Action

Run 2-E-IST to confirm Config E typed IST produces the same result. Then proceed to 2-G-IST / 2-H-IST (legacy DateTime typed in IST).
