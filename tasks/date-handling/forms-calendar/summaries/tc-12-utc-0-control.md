# TC-12-utc-0-control — Summary

**Spec**: [tc-12-utc-0-control.md](../test-cases/tc-12-utc-0-control.md)
**Current status**: PASS — last run 2026-04-01 (UTC+0)
**Bug surface**: Bug #5 present but masked — fake Z is coincidentally correct at UTC+0

## Run History

| Run | Date       | TZ    | Outcome | File                                          |
| --- | ---------- | ----- | ------- | --------------------------------------------- |
| 1   | 2026-04-01 | UTC+0 | PASS    | [run-1](../runs/tc-12-utc-0-control-run-1.md) |

## Current Interpretation

Config D GFV round-trip produces zero drift at UTC+0. Bug #5 still adds the fake `[Z]` suffix, but at UTC+0 local time = UTC, making the label accidentally correct. The round-trip is stable because `normalizeCalValue` parses `"T00:00:00.000Z"` as UTC midnight, which equals local midnight. This proves Bug #5 drift is proportional to the timezone offset: BRT (-3h/trip), UTC+0 (0/trip), IST (+5:30h/trip predicted).

## Next Action

No further action — closed PASS. This is the UTC+0 control for the Bug #5 drift comparison triangle.
