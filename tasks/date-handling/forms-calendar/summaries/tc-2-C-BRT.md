# TC-2-C-BRT — Summary

**Spec**: [tc-2-C-BRT.md](../test-cases/tc-2-C-BRT.md)
**Current status**: FAIL — last run 2026-04-03 (BRT, Firefox)
**Bug surface**: none

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-2-C-BRT-run-1.md) |
| 2   | 2026-04-03 | BRT | FAIL    | [run-2](../runs/tc-2-C-BRT-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): FAIL. Cross-browser verification in progress.

## Next Action

Run 2-C-IST to observe DateTime typed input behavior under UTC+ offset. Pending — IST DateTime typed input prediction revised to expect `"2026-03-15T00:00:00"` based on confirmed 1-C-IST behavior (getSaveValue formats local time).
