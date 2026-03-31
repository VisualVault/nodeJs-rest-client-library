# TC-1-A-IST — Summary

**Spec**: [tc-1-A-IST.md](../tc-1-A-IST.md)
**Current status**: FAIL-1 — last run 2026-03-30 (IST)
**Bug surface**: Bug #7 — date-only popup stores -1 day for UTC+ timezones

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-30 | IST | FAIL-1  | [run-1](../runs/tc-1-A-IST-run-1.md) |

## Current Interpretation

Config A (date-only, ignoreTZ=false, modern path) in IST confirms Bug #7: selecting March 15 from the calendar popup stores `"2026-03-14"` (one day earlier). The mechanism is `normalizeCalValue()` parsing the date string as local IST midnight, then `getSaveValue()` extracting the UTC date — at UTC+5:30, local midnight falls on the previous UTC calendar day. The form display correctly shows `03/15/2026` (re-converting to local) while storage holds March 14. This establishes the primary Bug #7 evidence for popup input. Paired with tc-1-A-BRT.md (PASS) and tc-1-A-UTC0.md (PASS) to show the timezone-dependent nature of the defect.

## Next Action

Bug #7 confirmed. Run tc-2-A-IST.md (typed input IST) to test if Bug #7 produces the same -1 day shift via typed input vs popup (testing Bug #2 hypothesis — popup creates Date object, typed creates string, potentially different shift amounts).
