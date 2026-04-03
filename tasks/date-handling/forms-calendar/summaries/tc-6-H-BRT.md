# TC-6-H-BRT — Summary

**Spec**: [tc-6-H-BRT.md](../test-cases/tc-6-H-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — legacy avoids Bug #5 (compare 6-D-BRT FAIL)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-6-H-BRT-run-1.md) |

## Current Interpretation

Config H legacy DateTime + ignoreTZ Current Date correct in BRT. Non-legacy Config D (6-D-BRT) FAILS with Bug #5 (fake Z, -3h shift), but Config H PASSES because `useLegacy=true` causes GFV to return the raw Date object, bypassing the `moment().format("[Z]")` path entirely. Round-trip safe.

## Next Action

Test 6-H-IST when expanding IST coverage. Key question: does the legacy protection hold in UTC+ timezones?
