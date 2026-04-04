# TC-7-E-dateOnly-IST — Summary

**Spec**: [tc-7-E-dateOnly-IST.md](../test-cases/tc-7-E-dateOnly-IST.md)
**Current status**: FAIL-1 — last run 2026-04-03 (IST)
**Bug surface**: Bug #7 — date-only SetFieldValue stores previous day in UTC+

## Run History

| Run | Date       | TZ  | Outcome | File                                          |
| --- | ---------- | --- | ------- | --------------------------------------------- |
| 1   | 2026-04-03 | IST | FAIL-1  | [run-1](../runs/tc-7-E-dateOnly-IST-run-1.md) |

## Current Interpretation

Bug #7 confirmed for legacy Config E in IST. `useLegacy=true` has no effect on the `normalizeCalValue()` → `getSaveValue()` path for date-only fields — the bug fires identically to Config A. The `useLegacy` flag only affects the `getCalendarFieldValue()` output path (GFV), not the input/store path (SFV).

## Next Action

Re-run after Bug #7 fix deployed.
