# TC-9-D-IST-5 — Summary

**Spec**: [tc-9-D-IST-5.md](../test-cases/tc-9-D-IST-5.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: Bug #5 (fake Z in GetFieldValue), Bug #5 consequence (+5:30h drift per round-trip in IST, day boundary crossed at Trip 5)

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-03-27 | IST | FAIL-1  | [run-1](../runs/tc-9-D-IST-5-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-9-D-IST-5-run-2.md) |
| 3   | 2026-04-09 | IST | FAIL    | [run-3](../runs/tc-9-D-IST-5-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No fix available until Bug #5 is patched in `getCalendarFieldValue()`. The IST data completes the bidirectional drift picture: UTC- timezones drift backward (BRT: −3h/trip, day lost at Trip 8); UTC+ timezones drift forward (IST: +5:30h/trip, day gained at Trip 5). Evidence is sufficient to characterize the bug for all timezone classes.
