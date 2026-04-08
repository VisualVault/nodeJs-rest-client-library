# TC-11-E-save-BRT-load-IST — Summary

**Spec**: [tc-11-E-save-BRT-load-IST.md](../test-cases/tc-11-E-save-BRT-load-IST.md)
**Current status**: PASS — last run 2026-04-08 (IST, Playwright CLI)
**Bug surface**: none — legacy date-only also immune

## Run History

| Run | Date       | TZ  | Outcome | File                                                |
| --- | ---------- | --- | ------- | --------------------------------------------------- |
| 1   | 2026-04-08 | IST | PASS    | [run-1](../runs/tc-11-E-save-BRT-load-IST-run-1.md) |

## Current Interpretation

Same as 11-A. Legacy date-only (Config E, useLegacy=true) also survives cross-TZ load. FORM-BUG-7 fires at input time only, not load time. All date-only configs (A, B, E) confirmed immune to load-time corruption.

## Next Action

No further action — closed PASS.
