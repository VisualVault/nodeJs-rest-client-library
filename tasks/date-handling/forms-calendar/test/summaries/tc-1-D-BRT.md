# TC-1-D-BRT — Summary

**Spec**: [tc-1-1-calendar-popup-brt.md](../tc-1-1-calendar-popup-brt.md)
**Current status**: FAIL-2 — last run 2026-03-27 (BRT)
**Bug surface**: Bug #5 — fake Z in GetFieldValue causes -3h drift per round-trip in BRT

## Run History

| Run | Date        | TZ  | Outcome | File                                 |
| --- | ----------- | --- | ------- | ------------------------------------ |
| 1   | ~2026-03-27 | BRT | FAIL-2  | [run-1](../runs/tc-1-D-BRT-run-1.md) |

## Current Interpretation

Config D (DateTime, ignoreTZ=true, modern path) in BRT confirms Bug #5: raw storage is correct (`"2026-03-15T00:00:00"`) but GetFieldValue appends a fake `[Z]` suffix, returning `"2026-03-15T00:00:00.000Z"`. This makes local BRT midnight appear as UTC midnight. When fed back through SetFieldValue, JS interprets the Z as real UTC, shifting the date by -3h per trip (UTC-3 offset). A full day is lost after 8 round-trips. The bug is in `getCalendarFieldValue()` which uses `moment(value).format("....[Z]")` for the `enableTime=true && ignoreTimezone=true` path. Bug confirmed across BRT (this TC), IST (tc-1-D-IST.md FAIL-2), with UTC+0 as the zero-drift control (tc-1-D-UTC0.md PASS).

## Next Action

Bug #5 confirmed across all three timezones. No additional re-runs needed for this specific scenario. Fix planning tracked in analysis.md.
