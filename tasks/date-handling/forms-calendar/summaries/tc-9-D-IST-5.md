# TC-9-D-IST-5 — Summary

**Spec**: [tc-2-5-roundtrip-ist.md](../test-cases/tc-2-5-roundtrip-ist.md)
**Current status**: FAIL-1 — last run 2026-03-27 (IST)
**Bug surface**: Bug #5 (fake Z in GetFieldValue), Bug #5 consequence (+5:30h drift per round-trip in IST, day boundary crossed at Trip 5)

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-03-27 | IST | FAIL-1  | [run-1](../runs/tc-9-D-IST-5-run-1.md) |

## Current Interpretation

Config D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) in IST: after 5 `SetFieldValue(GetFieldValue())` round-trips from a midnight baseline, the stored value is `"2026-03-16T03:30:00"` — a total of +27:30h drift from the original `"2026-03-15T00:00:00"`. The calendar date has advanced from March 15 to March 16. The day boundary is crossed between Trip 4 (+22h, still March 15) and Trip 5 (+27:30h, March 16 at 03:30). Each trip adds exactly +5:30h because `getCalendarFieldValue()` appends a fake `Z` to local midnight, and IST is UTC+5:30 ahead of UTC midnight. This run documents the 5-trip day-boundary milestone; the 1-trip baseline is separately documented in 9-D-IST-1.

## Next Action

No fix available until Bug #5 is patched in `getCalendarFieldValue()`. The IST data completes the bidirectional drift picture: UTC- timezones drift backward (BRT: −3h/trip, day lost at Trip 8); UTC+ timezones drift forward (IST: +5:30h/trip, day gained at Trip 5). Evidence is sufficient to characterize the bug for all timezone classes.
