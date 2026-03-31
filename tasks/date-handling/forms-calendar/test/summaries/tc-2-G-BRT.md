# TC-2-G-BRT — Summary

**Spec**: [tc-2-G-BRT.md](../tc-2-G-BRT.md)
**Current status**: PASS — last run 2026-03-31 (BRT)
**Bug surface**: Bug #2 (inconsistent popup vs typed handlers) — typed input stores local time via `getSaveValue()`; popup stores raw UTC ISO

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | BRT | PASS    | [run-1](../runs/tc-2-G-BRT-run-1.md) |

## Current Interpretation

Bug #2 confirmed in BRT: typed input for Config G stores `"2026-03-15T00:00:00"` (local midnight, no Z) while popup (tc-1-G-BRT) stores `"2026-03-15T03:00:00.000Z"` (UTC datetime with Z). The two input methods produce structurally different stored values for the same intended date. In BRT both values represent the same instant (Mar 15 midnight BRT), but the format inconsistency would cause different behavior on reload or cross-timezone access. Consistent with tc-2-G-IST finding.

## Next Action

Run 2-H-BRT (sibling — ignoreTZ variant) to confirm ignoreTZ is no-op on typed input path.
