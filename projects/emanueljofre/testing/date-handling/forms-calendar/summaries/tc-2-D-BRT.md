# TC-2-D-BRT — Summary

**Spec**: [tc-2-D-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-2-D-BRT.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: Bug #5 (GFV path) — not triggered via typed input in this run; Bug #2 — absent

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-2-D-BRT-run-1.md) |
| 2   | 2026-04-03 | BRT | FAIL    | [run-2](../runs/tc-2-D-BRT-run-2.md) |
| 3   | 2026-04-09 | BRT | FAIL    | [run-3](../runs/tc-2-D-BRT-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Run 2-D-IST to test typed input for Config D in IST timezone. Separately verify whether Bug #5 activates via GFV after a fresh typed entry in IST — the round-trip drift in IST (9-D-IST) is already confirmed via tc-2-5.
