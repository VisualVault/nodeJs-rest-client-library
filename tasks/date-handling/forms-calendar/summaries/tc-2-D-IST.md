# TC-2-D-IST — Summary

**Spec**: [tc-2-D-IST.md](../test-cases/tc-2-D-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Bug #5 (fake Z in GetFieldValue), Bug #6 (Invalid Date for empty field)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-2-D-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-2-D-IST-run-2.md) |
| 3   | 2026-04-09 | IST | FAIL    | [run-3](../runs/tc-2-D-IST-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Re-run after Bug #5 fix deployed. Verify that `GetFieldValue()` returns `"2026-03-15T00:00:00"` (matching raw stored value).
