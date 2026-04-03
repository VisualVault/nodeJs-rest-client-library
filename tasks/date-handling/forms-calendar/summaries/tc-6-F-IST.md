# TC-6-F-IST — Summary

**Spec**: [tc-6-F-IST.md](../test-cases/tc-6-F-IST.md)
**Current status**: PASS — last run 2026-04-03 (IST, Firefox)
**Bug surface**: none — both ignoreTZ and useLegacy inert on current date path

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | IST | PASS    | [run-1](../runs/tc-6-F-IST-run-1.md) |

## Current Interpretation

Config F legacy Current Date correct in IST. Same as 6-E-IST — `ignoreTZ=true` adds nothing on top of `useLegacy=true`, and neither flag affects the `new Date()` init path. All date-only Current Date fields (A, B, E, F) pass in IST.

## Next Action

No further action. All date-only Current Date configs verified clean in IST.
