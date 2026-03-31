# TC-3-D-BRT-IST — Summary

**Spec**: [tc-2-4-cross-tz-brt.md](../test-cases/tc-2-4-cross-tz-brt.md)
**Current status**: PASS — last run 2026-03-27 (IST)
**Bug surface**: Bug #5 (fake Z in GetFieldValue) — present but not triggered on reload path; Config D TZ-invariant on reload

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-03-27 | IST | PASS    | [run-1](../runs/tc-3-D-BRT-IST-run-1.md) |

## Current Interpretation

Config D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) saved from BRT and reloaded in IST shows no shift on reload. The raw stored value `"2026-03-15T00:00:00"` is TZ-invariant: `ignoreTimezone=true` suppresses all offset-based conversions in both the save and load paths, so the value and display are the same regardless of the reader's timezone. Display `03/15/2026 12:00 AM` is correct in IST. GFV returned the clean value — Bug #5 (fake Z appended by `getCalendarFieldValue()`) was not observed during reload. The cross-TZ reload for Config D is safe; the danger zone for IST users is the subsequent `SetFieldValue(GetFieldValue())` round-trip, which would introduce +5:30h drift per trip (see 9-D-IST-1).

## Next Action

Run 3-D-IST-BRT (save from IST, reload in BRT) when an IST-saved record is available. This is the inverse of the current run and completes the cross-TZ matrix for Config D reload. Predicted outcome: also PASS (TZ-invariant), same raw value returned regardless of save TZ.
