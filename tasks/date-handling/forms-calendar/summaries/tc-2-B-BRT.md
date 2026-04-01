# TC-2-B-BRT — Summary

**Spec**: [tc-2-B-BRT.md](../test-cases/tc-2-B-BRT.md)
**Current status**: PASS — last run 2026-03-27 (BRT)
**Bug surface**: none

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-2-B-BRT-run-1.md) |

## Current Interpretation

Config B (`enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`) typed input in BRT stores `"2026-03-15"` with no shift — identical to Config A. The `ignoreTimezone=true` flag has no effect on the date-only save path in V1; both configs route through the same `normalizeCalValue()` → `getSaveValue()` sequence and produce the same output. `GetFieldValue` returns the raw value unchanged (outside Bug #5 surface). Result matches popup (1-B-BRT) — Bug #2 absent. Covered under the same tc-1-2 multi-config BRT typed-input session.

## Next Action

Run 2-B-IST to confirm Bug #7 for IST (already done — see tc-2-B-IST summary). No further BRT runs needed unless build changes.
