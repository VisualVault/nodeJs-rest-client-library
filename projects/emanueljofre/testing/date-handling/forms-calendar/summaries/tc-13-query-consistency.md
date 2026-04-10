# TC-13-query-consistency — Summary

**Spec**: [tc-13-query-consistency.md](tasks/date-handling/forms-calendar/test-cases/tc-13-query-consistency.md)
**Current status**: FAIL — last run 2026-04-08 (BRT)
**Bug surface**: FORM-BUG-7 consequence — date queries miss records entered from UTC+ timezones

## Run History

| Run | Date       | TZ  | Outcome | File                                              |
| --- | ---------- | --- | ------- | ------------------------------------------------- |
| 1   | 2026-04-08 | BRT | FAIL    | [run-1](../runs/tc-13-query-consistency-run-1.md) |

## Current Interpretation

Date range queries return inconsistent results for records saved from different timezones. The query engine itself is correct (confirmed via WS-8 on fresh data). The inconsistency is caused by FORM-BUG-7 storing different dates for the same user selection. This has direct operational impact: reports and dashboards filtering by date will silently exclude IST-entered data when querying for the intended date.

## Next Action

Re-run after FORM-BUG-7 fix deployed. Verify that BRT and IST records both match `[Field7] eq '2026-03-15'` after fix.
