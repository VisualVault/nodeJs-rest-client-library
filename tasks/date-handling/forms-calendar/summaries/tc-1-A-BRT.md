# TC-1-A-BRT — Summary

**Spec**: [tc-1-A-BRT.md](../test-cases/tc-1-A-BRT.md)
**Current status**: PASS — last run 2026-04-01 (BRT)
**Bug surface**: none — BRT is UTC-3, no shift on date-only fields

## Run History

| Run | Date        | TZ  | Outcome | File                                 |
| --- | ----------- | --- | ------- | ------------------------------------ |
| 1   | ~2026-03-27 | BRT | PASS    | [run-1](../runs/tc-1-A-BRT-run-1.md) |
| 2   | 2026-03-31  | BRT | PASS    | [run-2](../runs/tc-1-A-BRT-run-2.md) |
| 3   | 2026-04-01  | BRT | PASS    | [run-3](../runs/tc-1-A-BRT-run-3.md) |

## Current Interpretation

Config A (date-only, no ignoreTZ, modern path) in BRT stores and returns the correct date without shift. BRT (UTC-3) midnight is still the same calendar day in UTC, so `getSaveValue()`'s UTC date extraction produces the correct result. GetFieldValue returns the raw date string without transformation. Run 3 (2026-04-01) via Playwright CLI with `timezoneId` override confirms identical results to runs 1-2 (system TZ) — validates Playwright TZ simulation as equivalent to system TZ change for browser-only tests.

## Next Action

No re-run needed for BRT. Monitor if VV platform build changes. Sibling IST test (tc-1-A-IST.md) is the active Bug #7 evidence.
