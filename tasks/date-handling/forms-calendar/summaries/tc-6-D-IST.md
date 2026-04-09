# TC-6-D-IST — Summary

**Spec**: [tc-6-D-IST.md](../test-cases/tc-6-D-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Bug #5 — fake Z on current date DateTime field at form load (+5:30h shift in IST)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-01 | IST | FAIL    | [run-1](../runs/tc-6-D-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-6-D-IST-run-2.md) |
| 3   | 2026-04-09 | IST | FAIL    | [run-3](../runs/tc-6-D-IST-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Test 6-C-IST (current date DateTime without ignoreTimezone) to determine if the `ignoreTimezone=false` path avoids the fake Z.
