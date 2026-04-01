# TC-2-A-BRT — Summary

**Spec**: [tc-2-A-BRT.md](../test-cases/tc-2-A-BRT.md)
**Current status**: PASS — last run 2026-04-01 (BRT, Chromium via Playwright CLI)
**Bug surface**: none — BRT is UTC-3, no shift on date-only fields

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-2-A-BRT-run-1.md) |
| 2   | 2026-04-01 | BRT | PASS    | [run-2](../runs/tc-2-A-BRT-run-2.md) |

## Current Interpretation

Config A (date-only, `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`) typed input in BRT stores `"2026-03-15"` correctly across two independent runs (Chrome MCP and Playwright CLI). BRT (UTC-3) midnight is still the same UTC calendar day, so no Bug #7 shift occurs. GetFieldValue returns the raw value unchanged — Config A is outside the Bug #5 surface. Result matches the calendar popup (1-A-BRT), confirming Bug #2 is absent for this config in BRT.

## Next Action

No re-run needed for BRT. Sibling IST test (tc-2-A-IST.md) confirms Bug #7 manifests for typed input in UTC+ timezones.
