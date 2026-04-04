# TC-8B-A-IST — Summary

**Spec**: [tc-8B-A-IST.md](../test-cases/tc-8B-A-IST.md)
**Current status**: FAIL — last run 2026-04-03 (IST, Chromium)
**Bug surface**: Bug #7 upstream — stored value corrupted before GDOC reads it

## Run History

| Run | Date       | TZ  | Outcome | File                                  |
| --- | ---------- | --- | ------- | ------------------------------------- |
| 1   | 2026-04-03 | IST | FAIL    | [run-1](../runs/tc-8B-A-IST-run-1.md) |

## Current Interpretation

SetFieldValue stores "2026-03-14" instead of "2026-03-15" for date-only in IST (Bug #7). GDOC correctly reads the corrupted value, showing Mar 14. The failure is upstream in normalizeCalValue, not in GetDateObjectFromCalendar.

## Next Action

Re-run after Bug #7 fix deployed.
