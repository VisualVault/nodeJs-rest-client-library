# TC-2-E-BRT — Summary

**Spec**: [tc-2-E-BRT.md](../test-cases/tc-2-E-BRT.md)
**Current status**: PASS — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: Bug #2 confirmed (popup stores UTC datetime `"2026-03-15T03:00:00.000Z"`; typed stores date-only `"2026-03-15"` for same field)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | BRT | PASS    | [run-1](../runs/tc-2-E-BRT-run-1.md) |
| 2   | 2026-04-03 | BRT | PASS    | [run-2](../runs/tc-2-E-BRT-run-2.md) |
| 3   | 2026-04-09 | BRT | PASS    | [run-3](../runs/tc-2-E-BRT-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): PASS. Cross-browser verification in progress.

## Next Action

Run 2-E-IST to test legacy typed input in IST — expected Bug #7 (-1 day), same mechanism as Config A/B typed IST. Also run 2-F-BRT (Config F, `ignoreTimezone=true`, `useLegacy=true`) to verify `ignoreTimezone` has no effect on the legacy typed path.
