# TC-1-C-IST — Summary

**Spec**: [tc-1-C-IST.md](../tc-1-C-IST.md)
**Current status**: PASS — last run 2026-03-30 (IST)
**Bug surface**: none — Config C (ignoreTZ=false, enableTime=true) stores and retrieves correctly in IST

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-30 | IST | PASS    | [run-1](../runs/tc-1-C-IST-run-1.md) |

## Current Interpretation

Config C (DateTime, ignoreTZ=false, modern path) in IST stores local IST midnight as `"2026-03-15T00:00:00"` and GetFieldValue returns the correct UTC conversion. The DateTime path is not affected by Bug #7 (date shift) because it stores the full local datetime without UTC date extraction. Bug #5 does not apply because `ignoreTZ=false` — `getCalendarFieldValue()` uses `new Date(value).toISOString()` (real conversion) rather than appending a fake Z. Config C in IST is the stable DateTime reference, identical in behavior to Config C in BRT — the timezone only affects what the real UTC value is, not whether the conversion is correct.

## Next Action

No re-run needed. Config C remains the stable DateTime reference across all tested timezones. Use as comparison baseline when verifying Config D IST results.
