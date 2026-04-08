# TC-9-GDOC-A-IST-1 — Summary

**Spec**: [tc-9-GDOC-A-IST-1.md](../test-cases/tc-9-GDOC-A-IST-1.md)
**Current status**: FAIL — last run 2026-04-08 (IST, Playwright CLI)
**Bug surface**: FORM-BUG-7 (compound shift on GDOC round-trip)

## Run History

| Run | Date       | TZ  | Outcome | File                                        |
| --- | ---------- | --- | ------- | ------------------------------------------- |
| 1   | 2026-04-08 | IST | FAIL    | [run-1](../runs/tc-9-GDOC-A-IST-1-run-1.md) |

## Current Interpretation

Double FORM-BUG-7 in IST produces -3 day compound shift. GDOC round-trip is UNSAFE for date-only fields in UTC+ timezones. Developers using GDOC.toISOString() → SFV pattern will corrupt date-only data. The initial SFV already stores -1 day (FORM-BUG-7), then GDOC reads that as IST local midnight → ISO Z shifts to previous UTC day → SFV strips and re-parses → another -1 day shift, landing at -3 total.

## Next Action

No further action — confirmed FAIL. Fix requires normalizeCalValue to handle ISO Z strings for date-only without stripping the date.
