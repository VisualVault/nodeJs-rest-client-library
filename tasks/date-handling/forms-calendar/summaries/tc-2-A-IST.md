# TC-2-A-IST — Summary

**Spec**: [tc-2-A-IST.md](../test-cases/tc-2-A-IST.md)
**Current status**: FAIL-1 — last run 2026-03-31 (IST)
**Bug surface**: Bug #7 (-1 day shift for date-only typed input in UTC+ timezones)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-2-A-IST-run-1.md) |

## Current Interpretation

Config A (`enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`) typed input in IST stores `"2026-03-14"` when the user types `03/15/2026` — one day earlier than intended. `normalizeCalValue()` parses the date string as local IST midnight (`2026-03-15T00:00:00 GMT+0530`); `getSaveValue()` then calls `toISOString()` and strips the Z, extracting the UTC date component (`2026-03-14`). The display renders from the browser's internal Date object (March 15 IST local midnight) and shows the correct intended date — the discrepancy is invisible until form reload. Result matches the calendar popup (1-A-IST): both typed and popup paths produce the same -1 day shift in IST for `useLegacy=false`; Bug #2 is absent. `GetFieldValue` returns the raw stored value unchanged (Config A outside Bug #5 surface).

## Next Action

Bug #7 confirmed for typed input in IST. Cross-check with 2-B-IST (already done — identical result). No further IST runs needed for this slot unless build changes. Track as high-severity for all UTC+ users working with date-only fields A and B.
