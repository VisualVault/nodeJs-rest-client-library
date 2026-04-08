# TC-13-cross-tz-save — Summary

**Spec**: [tc-13-cross-tz-save.md](../test-cases/tc-13-cross-tz-save.md)
**Current status**: FAIL — last run 2026-04-08 (BRT+IST)
**Bug surface**: FORM-BUG-7 — date-only fields store wrong day when saved from UTC+ timezones

## Run History

| Run | Date       | TZ      | Outcome | File                                          |
| --- | ---------- | ------- | ------- | --------------------------------------------- |
| 1   | 2026-04-08 | BRT+IST | FAIL    | [run-1](../runs/tc-13-cross-tz-save-run-1.md) |

## Current Interpretation

FORM-BUG-7 is confirmed at the database level for cross-TZ saves. Date-only fields (Config A) store different dates for the same user selection depending on the browser's timezone. Config D (DateTime+ignoreTZ) is immune because it stores local midnight without UTC conversion. This has direct impact on queries and reports — a search for "March 15" records will miss IST-entered data.

## Next Action

Re-run after FORM-BUG-7 fix deployed. Cross-reference with 13-query-consistency for query impact.
