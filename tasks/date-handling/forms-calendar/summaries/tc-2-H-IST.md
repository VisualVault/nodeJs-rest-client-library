# TC-2-H-IST — Summary

**Spec**: [tc-2-H-IST.md](../test-cases/tc-2-H-IST.md)
**Current status**: PASS — last run 2026-04-03 (IST, Firefox)
**Bug surface**: Bug #2 (popup vs typed format inconsistency) — typed stores correct format; popup stores buggy UTC format

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-01 | IST | PASS    | [run-1](../runs/tc-2-H-IST-run-1.md) |
| 2   | 2026-04-03 | IST | PASS    | [run-2](../runs/tc-2-H-IST-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): PASS. Cross-browser verification in progress.

## Next Action

Run 2-G-IST to verify Config G typed path also stores local midnight (confirming `ignoreTimezone` is a no-op on typed path).
