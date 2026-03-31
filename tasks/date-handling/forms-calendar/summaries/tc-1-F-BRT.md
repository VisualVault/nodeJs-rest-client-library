# TC-1-F-BRT — Summary

**Spec**: [tc-1-F-BRT.md](../test-cases/tc-1-F-BRT.md)
**Current status**: FAIL-1 — last run 2026-03-31 (BRT)
**Bug surface**: Legacy format — useLegacy=true popup stores full UTC datetime; ignoreTZ=true has no effect on legacy path

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | BRT | FAIL-1  | [run-1](../runs/tc-1-F-BRT-run-1.md) |

## Current Interpretation

Config F (date-only, ignoreTZ=true, useLegacy=true) in BRT stores `"2026-03-15T03:00:00.000Z"` — identical to Config E. The `ignoreTimezone=true` flag has no effect on the legacy popup path: both E and F use the same storage mechanism (full UTC datetime of local midnight). This rules out the possibility that `ignoreTimezone` might change how the legacy path stores values (e.g., UTC midnight instead of local midnight). The failure mode is identical to E-BRT: format mismatch (full UTC datetime vs expected date-only), no date shift in BRT. Run history for E, F, G, H in BRT all show the same FAIL-1 pattern, confirming a uniform legacy path behavior independent of `enableTime` and `ignoreTimezone` flags.

## Next Action

No further BRT runs needed for Config F. The legacy popup behavior is uniform across E/F/G/H in BRT. Run tc-1-F-IST.md (pending) to verify IST behavior matches the E-IST pattern.
