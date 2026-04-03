# TC-9-C-BRT-1 — Summary

**Spec**: [tc-9-C-BRT-1.md](../test-cases/tc-9-C-BRT-1.md)
**Current status**: PASS — last run 2026-04-03 (BRT, Firefox)
**Bug surface**: none — control/passing scenario

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-9-C-BRT-1-run-1.md) |
| 2   | 2026-04-03 | BRT | PASS    | [run-2](../runs/tc-9-C-BRT-1-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): PASS. Cross-browser verification in progress.

## Next Action

No further BRT round-trip runs needed for Config C — it is confirmed stable. Run 9-C-IST-1 to verify that Config C is also stable in IST (predicted: PASS; GFV for ignoreTimezone=false correctly offsets rather than fake-Z appending).
