# TC-2-B-IST — Summary

**Spec**: [tc-2-B-IST.md](../test-cases/tc-2-B-IST.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Bug #7 (-1 day shift for date-only typed input in UTC+ timezones); `ignoreTimezone=true` has no mitigating effect

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-2-B-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-2-B-IST-run-2.md) |
| 3   | 2026-04-09 | IST | FAIL    | [run-3](../runs/tc-2-B-IST-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No further IST runs needed for this slot. Bug #7 confirmed across Config A and Config B in IST via both popup and typed input paths. Proceed to 2-C-IST and 2-D-IST (DateTime typed input in IST) to determine whether the -1 day or same-day behavior applies to DateTime fields.
