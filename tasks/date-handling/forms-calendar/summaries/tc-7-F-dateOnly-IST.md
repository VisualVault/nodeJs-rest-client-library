# TC-7-F-dateOnly-IST — Summary

**Spec**: [tc-7-F-dateOnly-IST.md](../test-cases/tc-7-F-dateOnly-IST.md)
**Current status**: FAIL-1 — last run 2026-04-03 (IST)
**Bug surface**: Bug #7 — date-only SetFieldValue stores previous day in UTC+

## Run History

| Run | Date       | TZ  | Outcome | File                                          |
| --- | ---------- | --- | ------- | --------------------------------------------- |
| 1   | 2026-04-03 | IST | FAIL-1  | [run-1](../runs/tc-7-F-dateOnly-IST-run-1.md) |

## Current Interpretation

Bug #7 confirmed for legacy Config F in IST. Neither `useLegacy=true` nor `ignoreTimezone=true` protects date-only fields from the `normalizeCalValue()` → `getSaveValue()` path that shifts dates. Identical behavior to Config E-IST and A-dateOnly-IST — all date-only configs share the same buggy input path regardless of flags.

## Next Action

Re-run after Bug #7 fix deployed.
