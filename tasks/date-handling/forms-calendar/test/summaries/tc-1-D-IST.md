# TC-1-D-IST — Summary

**Spec**: [tc-1-D-IST.md](../tc-1-D-IST.md)
**Current status**: FAIL-2 — last run 2026-03-30 (IST)
**Bug surface**: Bug #5 — fake Z in GetFieldValue causes +5:30h drift per round-trip in IST

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-30 | IST | FAIL-2  | [run-1](../runs/tc-1-D-IST-run-1.md) |

## Current Interpretation

Config D (DateTime, ignoreTZ=true, modern path) in IST confirms Bug #5 from the UTC+ direction: raw storage is correct (`"2026-03-15T00:00:00"` — local IST midnight), but GetFieldValue appends fake `[Z]`, returning `"2026-03-15T00:00:00.000Z"`. The fake Z makes IST midnight appear as UTC midnight (2026-03-15T00:00:00Z), when the real UTC is `"2026-03-14T18:30:00.000Z"`. Round-trip drift in IST is +5:30h per trip (forward), as SetFieldValue interprets the Z as real UTC → +5:30h shift to local. Date shifts forward after ~4-5 round-trips. This is the opposite drift direction to BRT (tc-1-D-BRT.md: -3h per trip, backward) and confirms Bug #5 affects all non-UTC+0 timezones, with UTC+0 as the zero-drift coincidence (tc-1-D-UTC0.md).

## Next Action

Bug #5 confirmed for IST. Drift direction (forward) documented. Fix planning in analysis.md. No additional runs needed for this scenario.
