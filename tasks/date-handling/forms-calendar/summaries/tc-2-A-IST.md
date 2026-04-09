# TC-2-A-IST — Summary

**Spec**: [tc-2-A-IST.md](../test-cases/tc-2-A-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Bug #7 (-1 day shift for date-only typed input in UTC+ timezones)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-2-A-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-2-A-IST-run-2.md) |
| 3   | 2026-04-09 | IST | FAIL    | [run-3](../runs/tc-2-A-IST-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Bug #7 confirmed for typed input in IST. Cross-check with 2-B-IST (already done — identical result). No further IST runs needed for this slot unless build changes. Track as high-severity for all UTC+ users working with date-only fields A and B.
