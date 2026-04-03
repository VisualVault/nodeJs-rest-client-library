# TC-5-C-BRT — Summary

**Spec**: [tc-5-C-BRT.md](../test-cases/tc-5-C-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — DateTime preset preserves UTC timestamp, GFV returns real ISO

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-5-C-BRT-run-1.md) |

## Current Interpretation

Config C DateTime preset bypasses `parseDateString` truncation — raw Date is identical to `initialDate` (`"2026-03-31T11:29:14.181Z"`). GFV uses `new Date(value).toISOString()` → same real UTC ISO string. No bugs. Timezone-independent (same values as tc-5-C-IST).

**Key finding**: DateTime presets (Config C/D) store the raw Date from `initialDate` without processing through `parseDateString(false, true)`. This means Bug #3's hardcoded parameters don't affect the stored value for DateTime presets — only for date-only presets where `enableTime=false` triggers `.startOf('day')`.

## Next Action

No further action — behavior characterized. Config C is the safest preset configuration.
