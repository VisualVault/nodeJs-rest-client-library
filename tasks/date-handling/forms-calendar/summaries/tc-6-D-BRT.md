# TC-6-D-BRT — Summary

**Spec**: [tc-6-D-BRT.md](../test-cases/tc-6-D-BRT.md)
**Current status**: FAIL — last run 2026-04-03 (BRT)
**Bug surface**: Bug #5 — fake Z on Current Date GFV (-3h shift in BRT)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | FAIL-3  | [run-1](../runs/tc-6-D-BRT-run-1.md) |

## Current Interpretation

Bug #5 confirmed on Current Date at form load in BRT. Raw is correct (`new Date()` → UTC timestamp), but GFV returns BRT local time with fake Z (-3h shift). Matches behavior on Preset Date (5-D-BRT) and Current Date in IST (6-D-IST, +5:30h shift). Bug #5 affects ALL Config D init paths.

## Next Action

No further action for BRT. Bug #5 fully characterized across preset and current date in both BRT and IST.
