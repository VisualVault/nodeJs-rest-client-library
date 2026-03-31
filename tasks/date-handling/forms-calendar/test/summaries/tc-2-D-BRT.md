# TC-2-D-BRT — Summary

**Spec**: [tc-1-2-typed-input-brt.md](../tc-1-2-typed-input-brt.md)
**Current status**: PASS — last run 2026-03-27 (BRT)
**Bug surface**: Bug #5 (GFV path) — not triggered via typed input in this run; Bug #2 — absent

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-2-D-BRT-run-1.md) |

## Current Interpretation

Config D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) typed datetime input in BRT stores `"2026-03-15T00:00:00"` with no shift. `GetFieldValue` returned the same clean value — Bug #5 (fake Z) did not activate on the typed input path in this session. Note: Bug #5 is confirmed active on the popup path and in the round-trip test (9-D-BRT-1); the typed path appears to follow the same code in `getCalendarFieldValue()` but did not trigger the fake-Z branch in BRT for this run. Typed input and popup produced identical stored values — Bug #2 absent. Covered under the tc-1-2 multi-config BRT typed-input session as the primary (spec) field.

## Next Action

Run 2-D-IST to test typed input for Config D in IST timezone. Separately verify whether Bug #5 activates via GFV after a fresh typed entry in IST — the round-trip drift in IST (9-D-IST) is already confirmed via tc-2-5.
