# TC-1-G-IST — Summary

**Spec**: [tc-1-G-IST.md](../test-cases/tc-1-G-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Legacy format + IST midnight UTC crossover — stored UTC datetime has previous-day date portion; no Time tab despite enableTime=true

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-1-G-IST-run-1.md) |
| 2   | 2026-04-09 | IST | FAIL    | [run-2](../runs/tc-1-G-IST-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Run tc-1-H-IST (pending) to confirm ignoreTZ is a no-op for Config H in IST — expected to produce identical result. All legacy IST popup slots (E/F/G/H) would then be complete.
