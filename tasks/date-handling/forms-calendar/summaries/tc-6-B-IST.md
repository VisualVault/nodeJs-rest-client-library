# TC-6-B-IST — Summary

**Spec**: [tc-6-B-IST.md](../test-cases/tc-6-B-IST.md)
**Current status**: PASS — last run 2026-04-03 (IST, Firefox)
**Bug surface**: none — ignoreTZ inert on current date path; cross-midnight edge demonstrated

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | IST | PASS    | [run-1](../runs/tc-6-B-IST-run-1.md) |

## Current Interpretation

Config B Current Date correct in IST. `new Date()` init path bypasses all timezone-sensitive parsing. `ignoreTimezone=true` has no effect — identical to 6-A-IST. Cross-midnight edge confirmed: IST date (April 4) differs from UTC date (April 3), both correct.

## Next Action

No further action. Cross-midnight edge verified. All date-only Current Date configs (A, B, E, F) pass in IST.
