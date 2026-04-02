# TC-9-GDOC-D-IST-1 — Summary

**Spec**: [tc-9-GDOC-D-IST-1.md](../test-cases/tc-9-GDOC-D-IST-1.md)
**Current status**: PASS — last run 2026-04-01 (IST)
**Bug surface**: none — GDOC round-trip is stable (matrix prediction corrected)

## Run History

| Run | Date       | TZ  | Outcome | File                                        |
| --- | ---------- | --- | ------- | ------------------------------------------- |
| 1   | 2026-04-01 | IST | PASS    | [run-1](../runs/tc-9-GDOC-D-IST-1-run-1.md) |

## Current Interpretation

GDOC round-trip (`SFV(GDOC().toISOString())`) produces zero drift for Config D in IST, correcting the matrix prediction of +5:30h. The mechanism: GDOC.toISOString() returns real UTC (`2026-03-14T18:30:00.000Z`), SFV parses this as UTC midnight on March 14, converts to IST (March 15 00:00), and stores `"2026-03-15T00:00:00"` — the original value. This self-correcting behavior matches the BRT result (tc-9-GDOC-D-BRT-1) and confirms GDOC round-trip as universally stable across timezones. Developers should prefer `GetDateObjectFromCalendar().toISOString()` over `GetFieldValue()` for safe Config D round-trips.

## Next Action

No further GDOC round-trip runs needed. Stability confirmed across BRT and IST.
