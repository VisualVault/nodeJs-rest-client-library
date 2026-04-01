# TC-9-D-BRT-10 — Summary

**Spec**: [tc-9-D-BRT-10.md](../test-cases/tc-9-D-BRT-10.md)
**Current status**: FAIL-1 — last run 2026-03-27 (BRT)
**Bug surface**: Bug #5 (fake Z in GetFieldValue), Bug #5 consequence (−3h drift per round-trip, −30h at 10 trips in BRT)

## Run History

| Run | Date       | TZ  | Outcome | File                                    |
| --- | ---------- | --- | ------- | --------------------------------------- |
| 1   | 2026-03-27 | BRT | FAIL-1  | [run-1](../runs/tc-9-D-BRT-10-run-1.md) |

## Current Interpretation

Config D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) in BRT: after 10 `SetFieldValue(GetFieldValue())` round-trips from a BRT-midnight baseline, the stored value is `"2026-03-13T18:00:00"` — a total drift of −30h (10 × 3h). The calendar date has moved backward nearly two days from March 15 to March 13. This run documents the Trip 10 endpoint; the Trip 8 full-day-lost milestone (`"2026-03-14T00:00:00"`) was observed in the same loop and is separately documented in 9-D-BRT-8. The drift is mechanical and predictable: each trip compounds exactly −3h regardless of the value's position within a day. A scheduled script executing once per day against a Config D field in BRT would silently lose one calendar day every 8 days.

## Next Action

No fix available until Bug #5 is patched. This 10-trip evidence reinforces the high-severity blocker classification. The companion IST tests (9-D-IST-1, 9-D-IST-5) confirm the forward drift in UTC+ environments.
