# TC-2-D-IST — Summary

**Spec**: [tc-2-D-IST.md](../test-cases/tc-2-D-IST.md)
**Current status**: FAIL-1 — last run 2026-03-31 (IST)
**Bug surface**: Bug #5 (fake Z in GetFieldValue), Bug #6 (Invalid Date for empty field)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-2-D-IST-run-1.md) |

## Current Interpretation

Bug #5 confirmed in IST typed input — `GetFieldValue()` returns `"2026-03-15T00:00:00.000Z"` (fake Z) instead of `"2026-03-15T00:00:00"` (raw stored value). Same behavior as popup (1-D-IST). Raw storage is correct; the bug is isolated to `getCalendarFieldValue()` output transformation. In IST, each `SetFieldValue(GetFieldValue())` round-trip would shift the date forward by +5:30h.

## Next Action

Re-run after Bug #5 fix deployed. Verify that `GetFieldValue()` returns `"2026-03-15T00:00:00"` (matching raw stored value).
