# TC-2-A-BRT — Summary

**Spec**: [tc-1-2-typed-input-brt.md](../test-cases/tc-1-2-typed-input-brt.md)
**Current status**: PASS — last run 2026-03-27 (BRT)
**Bug surface**: none

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-2-A-BRT-run-1.md) |

## Current Interpretation

Config A (`enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`) typed input in BRT stores the correct date `"2026-03-15"` with no shift. BRT (UTC-3) midnight falls within the same UTC calendar day, so `normalizeCalValue()` → `getSaveValue()` produces the intended date. `GetFieldValue` returns the raw value unchanged — Config A is outside the Bug #5 surface (`enableTime=false`). Result matches the calendar popup (1-A-BRT), confirming Bug #2 is absent for this config in BRT. The tc-1-2 spec covers this slot as part of the multi-config BRT typed-input session.

## Next Action

Run 2-A-IST to confirm Bug #7 manifests for IST (already done — see tc-2-A-IST summary). No further BRT runs needed unless build changes.
