# TC-7-B-dateOnly-IST — Summary

**Spec**: [tc-7-B-dateOnly-IST.md](../test-cases/tc-7-B-dateOnly-IST.md)
**Current status**: FAIL-1 — last run 2026-04-03 (IST)
**Bug surface**: Bug #7 — date-only SetFieldValue stores previous day in UTC+

## Run History

| Run | Date       | TZ  | Outcome | File                                          |
| --- | ---------- | --- | ------- | --------------------------------------------- |
| 1   | 2026-04-03 | IST | FAIL-1  | [run-1](../runs/tc-7-B-dateOnly-IST-run-1.md) |

## Current Interpretation

Bug #7 confirmed for Config B date-only in IST. Stores `"2026-03-14"` instead of `"2026-03-15"` (-1 day). Identical to Config A dateOnly-IST — `ignoreTimezone=true` does not protect date-only fields from Bug #7.

## Next Action

Re-run after Bug #7 fix deployed.
