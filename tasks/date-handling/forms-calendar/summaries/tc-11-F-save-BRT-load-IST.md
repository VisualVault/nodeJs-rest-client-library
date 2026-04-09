# TC-11-F-save-BRT-load-IST — Summary

**Spec**: [tc-11-F-save-BRT-load-IST.md](../test-cases/tc-11-F-save-BRT-load-IST.md)
**Current status**: PASS — last run 2026-04-09 (IST, Playwright CLI)
**Bug surface**: none — legacy date-only + ignoreTZ immune to all known bugs

## Run History

| Run | Date       | TZ  | Outcome | File                                                |
| --- | ---------- | --- | ------- | --------------------------------------------------- |
| 1   | 2026-04-09 | IST | PASS    | [run-1](../runs/tc-11-F-save-BRT-load-IST-run-1.md) |

## Current Interpretation

Passes consistently — Config F (legacy date-only + ignoreTZ) is immune to cross-TZ load corruption. Matches Config E behavior (11-E-save-BRT-load-IST PASS). The `ignoreTZ` flag has no effect on date-only legacy load path. Completes the legacy date-only pair for BRT→IST.

## Next Action

No further action — closed PASS.
