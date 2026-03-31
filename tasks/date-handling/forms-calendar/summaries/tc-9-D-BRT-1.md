# TC-9-D-BRT-1 — Summary

**Spec**: [tc-1-3-roundtrip-brt.md](../test-cases/tc-1-3-roundtrip-brt.md)
**Current status**: FAIL-2 — last run 2026-03-27 (BRT)
**Bug surface**: Bug #5 (fake Z in GetFieldValue), Bug #5 consequence (-3h drift per round-trip in BRT)

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-03-27 | BRT | FAIL-2  | [run-1](../runs/tc-9-D-BRT-1-run-1.md) |

## Current Interpretation

Config D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) in BRT loses -3h per `SetFieldValue(GetFieldValue())` round-trip. The root cause is Bug #5: `getCalendarFieldValue()` appends a fake `Z` to the local time string, making the value appear to be UTC midnight. When `SetFieldValue` receives `"2026-03-15T00:00:00.000Z"`, it parses it as UTC midnight; in BRT (UTC-3) that is 21:00 March 14, which `getSaveValue()` stores as `"2026-03-14T21:00:00"`. One trip shifts -3h; 8 trips lose a full day; a single round-trip starting from Jan 1 midnight crosses the year boundary. This is a data-corruption bug for any script that reads then writes Config D fields.

## Next Action

No fix available until Bug #5 is patched in `getCalendarFieldValue()`. Document cumulative drift for 8 and 10 trips in tc-2-8-roundtrip-cumulative-brt.md (already done). Track as high-severity blocker for any production script using `GetFieldValue`/`SetFieldValue` on Config D fields.
