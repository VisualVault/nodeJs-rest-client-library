# TC-9-D-IST-1 — Summary

**Spec**: [tc-9-D-IST-1.md](../test-cases/tc-9-D-IST-1.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Bug #5 (fake Z in GetFieldValue), Bug #5 consequence (+5:30h drift per round-trip in IST)

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-03-27 | IST | FAIL-1  | [run-1](../runs/tc-9-D-IST-1-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-9-D-IST-1-run-2.md) |
| 3   | 2026-04-09 | IST | FAIL    | [run-3](../runs/tc-9-D-IST-1-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Run 9-D-IST-5 to document the 5-trip milestone (day boundary crossed). No fix available until Bug #5 is patched in `getCalendarFieldValue()`. IST evidence confirms Bug #5 affects all non-UTC timezones — direction depends on UTC± sign.
