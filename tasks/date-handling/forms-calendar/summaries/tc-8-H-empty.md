# TC-8-H-empty — Summary

**Spec**: [tc-8-H-empty.md](../test-cases/tc-8-H-empty.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Firefox)
**Bug surface**: none — control test confirming Bug #6 is absent for useLegacy=true

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-01 | BRT | PASS    | [run-1](../runs/tc-8-H-empty-run-1.md) |
| 2   | 2026-04-03 | BRT | PASS    | [run-2](../runs/tc-8-H-empty-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): PASS. Cross-browser verification in progress.

## Next Action

No further action for this TC — closed PASS. Bug #6 scope fully characterized across configs A (safe), B (safe, predicted), C (throws), D ("Invalid Date"), H (safe). Only E/F/G-empty remain untested but are predicted safe (date-only or legacy).
