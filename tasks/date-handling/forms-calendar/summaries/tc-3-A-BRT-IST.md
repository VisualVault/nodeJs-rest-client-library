# TC-3-A-BRT-IST — Summary

**Spec**: [tc-3-A-BRT-IST.md](../test-cases/tc-3-A-BRT-IST.md)
**Current status**: PASS — last run 2026-04-01 (IST)
**Bug surface**: Bug #7 predicted but NOT triggered — date-only string survives cross-TZ reload

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-01 | IST | PASS    | [run-1](../runs/tc-3-A-BRT-IST-run-1.md) |
| 2   | 2026-04-01 | IST | PASS    | [run-2](../runs/tc-3-A-BRT-IST-run-2.md) |

## Current Interpretation

Bug #7 does NOT fire on the form load path for date-only strings. Two runs confirm this: Run 1 on the old record (DateTest-000004 Rev 1) and Run 2 on a fresh BRT-saved record (DateTest-000080 Rev 2). Both show raw `"2026-03-15"`, GFV `"2026-03-15"`, and display `03/15/2026` — unchanged in IST. The V1 form load path for date-only fields preserves the raw string without Date object re-parsing. Bug #7's scope is narrower than originally analyzed — it affects `SetFieldValue`/`normalizeCalValue` paths but not the server reload path.

## Next Action

No further action — closed PASS. Run 3-B-BRT-IST to confirm the corrected prediction holds for Config B (date-only + ignoreTZ).
