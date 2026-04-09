# TC-8-V2 — Summary

**Spec**: [tc-8-V2.md](../test-cases/tc-8-V2.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: V2 code path — Bug #5 absent, UTC conversion also absent

## Run History

| Run | Date       | TZ  | Outcome | File                              |
| --- | ---------- | --- | ------- | --------------------------------- |
| 1   | 2026-04-03 | IST | PASS    | [run-1](../runs/tc-8-V2-run-1.md) |
| 2   | 2026-04-09 | IST | FAIL    | [run-2](../runs/tc-8-V2-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No further action — V2 GFV behavior characterized. Note: V2 activation via `?ObjectID=` or server flag should be tested separately to confirm natural activation path behaves identically.
