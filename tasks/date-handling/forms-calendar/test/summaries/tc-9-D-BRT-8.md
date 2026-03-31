# TC-9-D-BRT-8 — Summary

**Spec**: [tc-2-8-roundtrip-cumulative-brt.md](../tc-2-8-roundtrip-cumulative-brt.md)
**Current status**: FAIL-1 — last run 2026-03-27 (BRT)
**Bug surface**: Bug #5 (fake Z in GetFieldValue), Bug #5 consequence (−3h drift per round-trip in BRT, full day lost after 8 trips)

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-03-27 | BRT | FAIL-1  | [run-1](../runs/tc-9-D-BRT-8-run-1.md) |

## Current Interpretation

Config D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) in BRT accumulates −3h per `SetFieldValue(GetFieldValue())` round-trip due to Bug #5. Starting from `"2026-03-15T00:00:00"`, Trip 8 stores `"2026-03-14T00:00:00"` — a full calendar day lost. Trip 10 stores `"2026-03-13T18:00:00"` (−30h total). The mechanism is identical to the single-trip case (9-D-BRT-1): `getCalendarFieldValue()` appends a fake `Z`, making the local midnight appear to be UTC midnight; `SetFieldValue` parses UTC midnight as BRT 21:00, compounding on every call. Eight trips are needed to cross the next midnight boundary because the starting point is exactly midnight (8 × 3h = 24h). Any non-midnight start would alter the trip count at which the calendar date changes.

## Next Action

No fix available until Bug #5 is patched in `getCalendarFieldValue()`. This data confirms that production scripts looping over Config D fields (e.g., copy-field scripts, workflow automation) will silently corrupt dates. Document as high-severity blocker. Track companion test 9-D-BRT-10 for the 10-trip milestone confirmation.
