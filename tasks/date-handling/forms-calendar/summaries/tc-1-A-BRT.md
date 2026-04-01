# TC-1-A-BRT — Summary

**Spec**: [tc-1-A-BRT.md](../test-cases/tc-1-A-BRT.md)
**Current status**: PASS — last run 2026-04-01 (BRT, WebKit)
**Bug surface**: none — BRT is UTC-3, no shift on date-only fields

## Run History

| Run | Date        | TZ  | Outcome | File                                 |
| --- | ----------- | --- | ------- | ------------------------------------ |
| 1   | ~2026-03-27 | BRT | PASS    | [run-1](../runs/tc-1-A-BRT-run-1.md) |
| 2   | 2026-03-31  | BRT | PASS    | [run-2](../runs/tc-1-A-BRT-run-2.md) |
| 3   | 2026-04-01  | BRT | PASS    | [run-3](../runs/tc-1-A-BRT-run-3.md) |
| 4   | 2026-04-01  | BRT | PASS    | [run-4](../runs/tc-1-A-BRT-run-4.md) |

## Current Interpretation

Config A (date-only, no ignoreTZ, modern path) in BRT stores and returns the correct date without shift. BRT (UTC-3) midnight is still the same calendar day in UTC, so `getSaveValue()`'s UTC date extraction produces the correct result. GetFieldValue returns the raw date string without transformation. Run 4 (2026-04-01, WebKit) confirms cross-browser consistency — WebKit produces identical values to Chrome (runs 1-3). All three tested engines (Chrome/Chromium, WebKit) agree.

## Next Action

No re-run needed for BRT. Monitor if VV platform build changes. Sibling IST test (tc-1-A-IST.md) is the active Bug #7 evidence.
