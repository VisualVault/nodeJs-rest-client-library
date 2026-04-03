# TC-5-D-IST — Summary

**Spec**: [tc-5-D-IST.md](../test-cases/tc-5-D-IST.md)
**Current status**: FAIL — last run 2026-04-03 (IST, Firefox)
**Bug surface**: Bug #5 — fake Z on preset DateTime field at form load (+5:30h shift in IST)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-01 | IST | FAIL    | [run-1](../runs/tc-5-D-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-5-D-IST-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): FAIL. Cross-browser verification in progress.

## Next Action

Test 5-C-IST (DateTime without ignoreTimezone) to determine if preset DateTime fields without the `ignoreTimezone` flag avoid the fake Z path.
