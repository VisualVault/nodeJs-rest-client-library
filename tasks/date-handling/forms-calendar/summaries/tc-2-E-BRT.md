# TC-2-E-BRT — Summary

**Spec**: [tc-2-E-BRT.md](../test-cases/tc-2-E-BRT.md)
**Current status**: PASS — last run 2026-03-31 (BRT)
**Bug surface**: Bug #2 confirmed (popup stores UTC datetime `"2026-03-15T03:00:00.000Z"`; typed stores date-only `"2026-03-15"` for same field)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | BRT | PASS    | [run-1](../runs/tc-2-E-BRT-run-1.md) |

## Current Interpretation

Config E (`enableTime=false`, `ignoreTimezone=false`, `useLegacy=true`) typed input in BRT stores `"2026-03-15"` — the correct date with no shift. The legacy typed path (`calChange()`) stores the date as a plain string without UTC conversion, while the legacy popup path (`calChangeSetValue()`) stores the full UTC datetime `"2026-03-15T03:00:00.000Z"`. This divergence between the two handlers on the same `useLegacy=true` field confirms Bug #2 for the legacy code path. In BRT (UTC-3) the typed result is the intended date, so this run is a storage-level PASS even though the overall field behavior is inconsistent. `GetFieldValue` returned `"2026-03-15"` unchanged — no transformation for Config E. No Bug #7 effect in BRT for date-only typed input.

## Next Action

Run 2-E-IST to test legacy typed input in IST — expected Bug #7 (-1 day), same mechanism as Config A/B typed IST. Also run 2-F-BRT (Config F, `ignoreTimezone=true`, `useLegacy=true`) to verify `ignoreTimezone` has no effect on the legacy typed path.
