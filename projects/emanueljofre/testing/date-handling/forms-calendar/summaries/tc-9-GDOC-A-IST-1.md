# TC-9-GDOC-A-IST-1 — Summary

**Spec**: [tc-9-GDOC-A-IST-1.md](tasks/date-handling/forms-calendar/test-cases/tc-9-GDOC-A-IST-1.md)
**Current status**: FAIL — last run 2026-04-09 (IST, Chromium)
**Bug surface**: FORM-BUG-7 (compound shift on GDOC round-trip)

## Run History

| Run | Date       | TZ  | Outcome | File                                        |
| --- | ---------- | --- | ------- | ------------------------------------------- |
| 1   | 2026-04-08 | IST | FAIL    | [run-1](../runs/tc-9-GDOC-A-IST-1-run-1.md) |
| 2   | 2026-04-09 | IST | FAIL    | [run-2](../runs/tc-9-GDOC-A-IST-1-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No further action — confirmed FAIL. Fix requires normalizeCalValue to handle ISO Z strings for date-only without stripping the date.
