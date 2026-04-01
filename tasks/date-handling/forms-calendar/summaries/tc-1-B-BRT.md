# TC-1-B-BRT — Summary

**Spec**: [tc-1-B-BRT.md](../test-cases/tc-1-B-BRT.md)
**Current status**: PASS — last run 2026-04-01 (BRT, Chromium via Playwright CLI)
**Bug surface**: none — ignoreTZ=true has no effect on date-only storage in BRT

## Run History

| Run | Date        | TZ  | Outcome | File                                 |
| --- | ----------- | --- | ------- | ------------------------------------ |
| 1   | ~2026-03-27 | BRT | PASS    | [run-1](../runs/tc-1-B-BRT-run-1.md) |
| 2   | 2026-04-01  | BRT | PASS    | [run-2](../runs/tc-1-B-BRT-run-2.md) |

## Current Interpretation

Config B (date-only, ignoreTZ=true, modern path) in BRT stores and returns the correct date without shift across two independent runs (Chrome MCP and Playwright CLI). BRT (UTC-3) midnight is still the same calendar day in UTC, so `getSaveValue()`'s UTC date extraction produces the correct result. The `ignoreTimezone` flag has no observable effect on date-only storage or GetFieldValue retrieval — it only affects `getCalendarFieldValue()` when `enableTime=true`. Identical to Config A results.

## Next Action

No re-run needed for BRT. Sibling IST test (tc-1-B-IST.md) confirms ignoreTZ has no protective effect against Bug #7 in UTC+ timezones.
