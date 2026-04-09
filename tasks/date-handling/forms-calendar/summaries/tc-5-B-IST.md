# TC-5-B-IST — Summary

**Spec**: [tc-5-B-IST.md](../test-cases/tc-5-B-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Bug #7 — preset date stores Feb 28 instead of Mar 1 in IST

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | IST | FAIL-3  | [run-1](../runs/tc-5-B-IST-run-1.md) |
| 2   | 2026-04-09 | IST | FAIL    | [run-2](../runs/tc-5-B-IST-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No further action — Bug #7 fully characterized for date-only presets in IST across Config A and B. The bug is config-independent for date-only fields.
