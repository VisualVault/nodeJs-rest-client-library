# TC-3-D-BRT-IST — Summary

**Spec**: [tc-3-D-BRT-IST.md](../test-cases/tc-3-D-BRT-IST.md)
**Current status**: FAIL — last run 2026-04-03 (IST, Firefox)
**Bug surface**: Bug #5 (fake Z in GetFieldValue) — confirmed active on IST reload across two records

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-03-27 | IST | PASS    | [run-1](../runs/tc-3-D-BRT-IST-run-1.md) |
| 2   | 2026-04-01 | IST | FAIL-3  | [run-2](../runs/tc-3-D-BRT-IST-run-2.md) |
| 3   | 2026-04-01 | IST | FAIL-3  | [run-3](../runs/tc-3-D-BRT-IST-run-3.md) |
| 4   | 2026-04-03 | IST | FAIL    | [run-4](../runs/tc-3-D-BRT-IST-run-4.md) |

## Current Interpretation

Run 4 (2026-04-03, Firefox): FAIL. Cross-browser verification in progress.

## Next Action

Re-run 3-D-BRT-BRT on the fresh record (DateTest-000080) to confirm Bug #5 is also active on same-TZ reload. Then run 3-D-IST-BRT when an IST-saved record is available.
