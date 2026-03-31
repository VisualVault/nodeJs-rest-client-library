# TC-2-H-BRT — Summary

**Spec**: [tc-2-H-BRT.md](../tc-2-H-BRT.md)
**Current status**: PASS — last run 2026-03-31 (BRT)
**Bug surface**: Bug #2 (popup vs typed inconsistency) — typed path stores correctly; popup stores differently

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | BRT | PASS    | [run-1](../runs/tc-2-H-BRT-run-1.md) |

## Current Interpretation

Typed input for Config H in BRT stores `"2026-03-15T00:00:00"` — local midnight without Z suffix, via `getSaveValue()`. GetFieldValue returns the raw value unchanged (`useLegacy=true` bypasses the fake Z code path). Result is identical to Config G (tc-2-G-BRT), confirming `ignoreTimezone` has no effect on the typed input path. Bug #2 is confirmed: the popup path (tc-1-H-BRT) stores `"2026-03-15T03:00:00.000Z"` (raw UTC), producing a structurally different DB value for the same intended date.

## Next Action

No further action — closed PASS. Category 2 is now complete (16/16). Config H typed input behavior is fully characterized across BRT and IST.
