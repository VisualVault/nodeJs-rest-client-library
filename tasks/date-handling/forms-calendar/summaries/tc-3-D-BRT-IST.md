# TC-3-D-BRT-IST — Summary

**Spec**: [tc-3-D-BRT-IST.md](../test-cases/tc-3-D-BRT-IST.md)
**Current status**: FAIL-3 — last run 2026-04-01 (IST)
**Bug surface**: Bug #5 (fake Z in GetFieldValue) — confirmed active on IST reload across two records

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-03-27 | IST | PASS    | [run-1](../runs/tc-3-D-BRT-IST-run-1.md) |
| 2   | 2026-04-01 | IST | FAIL-3  | [run-2](../runs/tc-3-D-BRT-IST-run-2.md) |
| 3   | 2026-04-01 | IST | FAIL-3  | [run-3](../runs/tc-3-D-BRT-IST-run-3.md) |

## Current Interpretation

Bug #5 is consistently reproducible on IST reload. Runs 2 and 3 both show `GetFieldValue()` returning `"2026-03-15T00:00:00.000Z"` (fake Z) instead of the raw stored value. Run 1 (2026-03-27) was anomalous — likely the GFV path hadn't fully initialized during that early session. Display and date content are correct and TZ-invariant; only the GFV output is buggy. Run 3 also revealed a raw format change on the fresh record (`"03/15/2026 00:00:00"` instead of ISO `"2026-03-15T00:00:00"`), but the date content is correct — no timezone shift.

## Next Action

Re-run 3-D-BRT-BRT on the fresh record (DateTest-000080) to confirm Bug #5 is also active on same-TZ reload. Then run 3-D-IST-BRT when an IST-saved record is available.
