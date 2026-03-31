# TC-1-B-BRT — Summary

**Spec**: [tc-1-B-BRT.md](../test-cases/tc-1-B-BRT.md)
**Current status**: PASS — last run 2026-03-27 (BRT)
**Bug surface**: none — ignoreTZ=true has no effect on date-only storage in BRT

## Run History

| Run | Date        | TZ  | Outcome | File                                 |
| --- | ----------- | --- | ------- | ------------------------------------ |
| 1   | ~2026-03-27 | BRT | PASS    | [run-1](../runs/tc-1-B-BRT-run-1.md) |

## Current Interpretation

Config B (date-only, ignoreTZ=true, modern path) in BRT behaves identically to Config A. The `ignoreTimezone` flag has no observable effect on date-only storage or GetFieldValue retrieval — it only affects the `getCalendarFieldValue()` path when `enableTime=true`. Both raw stored value and GetFieldValue return `"2026-03-15"` with no shift. This confirms that ignoreTZ is inert for date-only fields regardless of the timezone, and also that Bug #7 does not affect BRT for any date-only config.

## Next Action

No re-run needed for BRT. Sibling IST test (tc-1-B-IST.md) confirms ignoreTZ has no protective effect against Bug #7 in UTC+ timezones.
