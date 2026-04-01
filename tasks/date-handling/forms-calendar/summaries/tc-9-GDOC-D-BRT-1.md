# TC-9-GDOC-D-BRT-1 — Summary

**Spec**: [tc-9-GDOC-D-BRT-1.md](../test-cases/tc-9-GDOC-D-BRT-1.md)
**Current status**: PASS — last run 2026-04-01 (BRT)
**Bug surface**: none — GDOC round-trip is stable (contrasts Bug #5 GFV drift)

## Run History

| Run | Date       | TZ  | Outcome | File                                        |
| --- | ---------- | --- | ------- | ------------------------------------------- |
| 1   | 2026-04-01 | BRT | PASS    | [run-1](../runs/tc-9-GDOC-D-BRT-1-run-1.md) |

## Current Interpretation

GDOC round-trip (`SetFieldValue(field, GetDateObjectFromCalendar(field).toISOString())`) produces zero drift for Config D in BRT. The real UTC string `"2026-03-15T03:00:00.000Z"` is correctly parsed by `normalizeCalValue` → moment recognizes the Z suffix → converts to local BRT midnight → stores `"2026-03-15T00:00:00"` (unchanged). Matrix prediction of -3h was wrong — corrected to 0 drift. This provides a safe alternative to the drifting GFV round-trip (Bug #5, -3h/trip).

## Next Action

Run 9-GDOC-D-IST-1 to verify GDOC round-trip stability in IST (UTC+5:30). IST behavior may differ since local midnight is the previous UTC day.
