# TC-9-D-IST-1 — Summary

**Spec**: [tc-9-D-IST-1.md](../test-cases/tc-9-D-IST-1.md)
**Current status**: FAIL-1 — last run 2026-03-27 (IST)
**Bug surface**: Bug #5 (fake Z in GetFieldValue), Bug #5 consequence (+5:30h drift per round-trip in IST)

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-03-27 | IST | FAIL-1  | [run-1](../runs/tc-9-D-IST-1-run-1.md) |

## Current Interpretation

Config D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) in IST loses +5:30h per `SetFieldValue(GetFieldValue())` round-trip. The root cause is identical to the BRT case (9-D-BRT-1): `getCalendarFieldValue()` appends a fake `Z` to the local time string, making `"2026-03-15T00:00:00"` appear to be UTC midnight. When `SetFieldValue` receives `"2026-03-15T00:00:00.000Z"`, it parses UTC midnight; in IST (UTC+5:30) that is 05:30 AM March 15, which `getSaveValue()` stores as `"2026-03-15T05:30:00"`. One trip shifts +5:30h. The drift direction is forward (UTC+) versus backward in BRT (UTC-). After approximately 4–5 trips, the cumulative drift exceeds 24h and the calendar date advances to March 16.

## Next Action

Run 9-D-IST-5 to document the 5-trip milestone (day boundary crossed). No fix available until Bug #5 is patched in `getCalendarFieldValue()`. IST evidence confirms Bug #5 affects all non-UTC timezones — direction depends on UTC± sign.
