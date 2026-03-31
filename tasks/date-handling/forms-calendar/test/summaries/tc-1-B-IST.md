# TC-1-B-IST — Summary

**Spec**: [tc-1-B-IST.md](../tc-1-B-IST.md)
**Current status**: FAIL-1 — last run 2026-03-30 (IST)
**Bug surface**: Bug #7 — date-only popup stores -1 day in IST; ignoreTZ=true has no protective effect

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-30 | IST | FAIL-1  | [run-1](../runs/tc-1-B-IST-run-1.md) |

## Current Interpretation

Config B (date-only, ignoreTZ=true, modern path) in IST produces the same FAIL-1 result as Config A: popup selection of March 15 stores `"2026-03-14"`. The `ignoreTimezone` flag has no effect on Bug #7 because Bug #7 lives in `normalizeCalValue()` and `getSaveValue()` — neither function conditions on `ignoreTimezone` for date-only fields. The `ignoreTimezone` flag only affects `getCalendarFieldValue()` output (Bug #5 path, which requires `enableTime=true`). This run closes the hypothesis that ignoreTZ might protect date-only fields from Bug #7.

## Next Action

Bug #7 confirmed for both Config A and B in IST. No further runs of this TC needed unless platform build changes. Track alongside tc-1-A-IST.md for Bug #7 fix coverage.
