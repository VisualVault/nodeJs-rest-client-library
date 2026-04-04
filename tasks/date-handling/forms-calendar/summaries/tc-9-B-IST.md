# TC-9-B-IST — Summary

**Spec**: [tc-9-B-IST.md](../test-cases/tc-9-B-IST.md)
**Current status**: FAIL — last run 2026-04-03 (IST, Chromium)
**Bug surface**: Bug #7 — date-only SFV in IST loses 1 day per call

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | IST | FAIL    | [run-1](../runs/tc-9-B-IST-run-1.md) |

## Current Interpretation

Bug #7 (not Bug #5) causes -1 day per SFV call on date-only fields in UTC+ timezones. Initial SFV loses 1 day (Mar 15 -> Mar 14), then the round-trip SFV loses another (Mar 14 -> Mar 13). This is fundamentally different from Bug #5 — it is a per-SFV-call drift rather than a GFV transformation issue. Matrix prediction corrected from "0 drift" to "-1 day per SFV".

## Next Action

Re-run after Bug #7 fix.
