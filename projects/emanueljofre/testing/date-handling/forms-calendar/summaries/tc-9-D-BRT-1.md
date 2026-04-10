# TC-9-D-BRT-1 — Summary

**Spec**: [tc-9-D-BRT-1.md](tasks/date-handling/forms-calendar/test-cases/tc-9-D-BRT-1.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: Bug #5 (fake Z in GetFieldValue), Bug #5 consequence (-3h drift per round-trip in BRT)

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-03-27 | BRT | FAIL-2  | [run-1](../runs/tc-9-D-BRT-1-run-1.md) |
| 2   | 2026-04-03 | BRT | FAIL    | [run-2](../runs/tc-9-D-BRT-1-run-2.md) |
| 3   | 2026-04-09 | BRT | FAIL    | [run-3](../runs/tc-9-D-BRT-1-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No fix available until Bug #5 is patched in `getCalendarFieldValue()`. Document cumulative drift for 8 and 10 trips in tc-2-8-roundtrip-cumulative-brt.md (already done). Track as high-severity blocker for any production script using `GetFieldValue`/`SetFieldValue` on Config D fields.
