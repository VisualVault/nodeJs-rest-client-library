# TC-1-C-BRT — Summary

**Spec**: [tc-1-C-BRT.md](../test-cases/tc-1-C-BRT.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: none — Config C (ignoreTZ=false) uses proper UTC conversion; round-trip stable

## Run History

| Run | Date        | TZ  | Outcome | File                                 |
| --- | ----------- | --- | ------- | ------------------------------------ |
| 1   | ~2026-03-27 | BRT | PASS    | [run-1](../runs/tc-1-C-BRT-run-1.md) |
| 2   | 2026-04-03  | BRT | FAIL    | [run-2](../runs/tc-1-C-BRT-run-2.md) |
| 3   | 2026-04-09  | BRT | FAIL    | [run-3](../runs/tc-1-C-BRT-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No re-run needed. Config C BRT is the stable DateTime baseline. Run tc-1-C-IST.md to verify IST behavior (expected: same storage, GetFieldValue returns correct UTC conversion for IST midnight).
