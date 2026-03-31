# TC-1-A-BRT — Summary

**Spec**: [tc-1-A-BRT.md](../tc-1-A-BRT.md)
**Current status**: PASS — last run 2026-03-27 (BRT)
**Bug surface**: none — BRT is UTC-3, no shift on date-only fields

## Run History

| Run | Date        | TZ  | Outcome | File                                 |
| --- | ----------- | --- | ------- | ------------------------------------ |
| 1   | ~2026-03-27 | BRT | PASS    | [run-1](../runs/tc-1-A-BRT-run-1.md) |

## Current Interpretation

Config A (date-only, no ignoreTZ, modern path) in BRT stores and returns the correct date without shift. BRT (UTC-3) midnight is still the same calendar day in UTC, so `getSaveValue()`'s UTC date extraction produces the correct result. GetFieldValue returns the raw date string without transformation. This TC functions as the BRT baseline for Bug #7 analysis — paired with tc-1-A-IST.md (FAIL) and tc-1-A-UTC0.md (PASS) to establish the timezone-dependent nature of Bug #7.

## Next Action

No re-run needed for BRT. Monitor if VV platform build changes. Sibling IST test (tc-1-A-IST.md) is the active Bug #7 evidence.
