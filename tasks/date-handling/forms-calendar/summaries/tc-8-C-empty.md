# TC-8-C-empty — Summary

**Spec**: [tc-8-C-empty.md](../test-cases/tc-8-C-empty.md)
**Current status**: FAIL — last run 2026-04-03 (BRT, Firefox)
**Bug surface**: Bug #6 variant — GetFieldValue throws RangeError for empty Config C fields

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-01 | BRT | FAIL-1  | [run-1](../runs/tc-8-C-empty-run-1.md) |
| 2   | 2026-04-03 | BRT | FAIL    | [run-2](../runs/tc-8-C-empty-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): FAIL. Cross-browser verification in progress.

## Next Action

Update Bug #6 analysis to include Config C throw variant. Run 8-H-empty to confirm useLegacy=true prevents both variants.
