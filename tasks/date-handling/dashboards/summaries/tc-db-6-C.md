# TC-DB-6-C — Summary

**Spec**: [tc-db-6-C.md](../test-cases/tc-db-6-C.md)
**Current status**: FAIL-2 — last run 2026-04-02
**Bug surface**: Time shift — dashboard UTC `2:30 PM` vs form BRT `11:30 AM` (-3h)

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | FAIL-2  | [run-1](../runs/tc-db-6-C-run-1.md) |

## Current Interpretation

The dashboard renders the stored UTC value directly (`T14:30:00Z` → `2:30 PM`). The Forms V1 code path converts UTC to local time (`14:30Z` → `11:30 BRT`). Both are "correct" in their own framework but produce a 3-hour discrepancy visible to users who view the same record in both layers. The discrepancy magnitude equals the user's UTC offset (3h for BRT, 5.5h for IST, 0h for UTC+0).

## Next Action

No re-run needed. Cross-layer UTC vs local time inconsistency documented.
